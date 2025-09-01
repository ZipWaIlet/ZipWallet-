import { Connection, PublicKey, Commitment, LogsCallback, Logs, ParsedTransactionWithMeta } from "@solana/web3.js"
import { EventEmitter } from "events"
import {
  pushFlowConfigSchema,
  PushFlowConfig,
  pushFlowParamsSchema,
  PushFlowParams,
  PushFlowEvent,
} from "./definePushFlowShape"

type InternalStats = {
  startedAt: number
  flowsEmitted: number
  lastSignature?: string
  lastSlot?: number
}

type ParsedLog =
  | { kind: "instruction"; name: string; payload?: Record<string, unknown> }
  | { kind: "programLog"; payload?: Record<string, unknown> }
  | { kind: "computeUnits"; consumed: number; limit?: number }
  | { kind: "other" }

export class PushFlowService extends EventEmitter {
  private connection: Connection
  private commitment: Commitment
  private listeners = new Map<string, number>()
  private stats = new Map<string, InternalStats>()

  constructor(rawConfig: unknown) {
    super()
    const { endpoint, commitment }: PushFlowConfig = pushFlowConfigSchema.parse(rawConfig)
    this.connection = new Connection(endpoint, commitment)
    this.commitment = commitment
    process.once("beforeExit", () => void this.stopAll())
  }

  /**
   * Start streaming instruction events for a program
   * Emits:
   *  - "started", programId
   *  - "flow", PushFlowEvent
   *  - "error:<programId>", Error
   */
  public start(rawParams: unknown): string {
    const { programId, instructionFilters }: PushFlowParams = pushFlowParamsSchema.parse(rawParams)
    const key = programId.toString()
    if (this.listeners.has(key)) {
      throw new Error(`Listener already running for program ${key}`)
    }
    const programKey = new PublicKey(programId)

    const handler: LogsCallback = async (logInfo: Logs) => {
      try {
        const { signature, logs } = logInfo

        let slot = -1
        try {
          const status = await this.connection.getSignatureStatuses([signature], {
            searchTransactionHistory: true,
          })
          slot = status.value[0]?.slot ?? -1
        } catch {
          // ignore: status may be unavailable for very new or old signatures
        }

        // Best-effort compute units and payload accumulation per signature
        let computeConsumed: number | undefined
        let computeLimit: number | undefined

        for (const line of logs) {
          const parsed = this.parseLogLine(line)

          if (parsed.kind === "computeUnits") {
            computeConsumed = parsed.consumed
            computeLimit = parsed.limit
            continue
          }

          if (parsed.kind === "instruction") {
            const name = parsed.name
            if (instructionFilters && !instructionFilters.includes(name)) continue

            const evt: PushFlowEvent = {
              signature,
              slot,
              instruction: name,
              data: this.safeData(parsed.payload),
            }

            // attach compute metrics if discovered
            if (computeConsumed !== undefined) {
              ;(evt as any).computeUnits = {
                consumed: computeConsumed,
                limit: computeLimit,
              }
            }

            this.bumpStats(key, signature, slot)
            this.emit("flow", evt)
            continue
          }

          if (parsed.kind === "programLog" && parsed.payload) {
            // Optional: emit supplementary program log payloads under the same signature
            const evt: PushFlowEvent = {
              signature,
              slot,
              instruction: "ProgramLog",
              data: this.safeData(parsed.payload),
            }
            this.bumpStats(key, signature, slot)
            this.emit("flow", evt)
            continue
          }
        }
      } catch (err) {
        this.emit(`error:${key}`, err)
      }
    }

    const listenerId = this.connection.onLogs(programKey, handler, this.commitment)
    this.listeners.set(key, listenerId)
    this.stats.set(key, { startedAt: Date.now(), flowsEmitted: 0 })
    this.emit("started", key)
    return key
  }

  /**
   * Stop streaming for a given program
   */
  public async stop(programId: string): Promise<boolean> {
    const listenerId = this.listeners.get(programId)
    if (!listenerId) return false
    await this.connection.removeOnLogsListener(listenerId)
    this.listeners.delete(programId)
    this.emit("stopped", programId)
    return true
  }

  /**
   * Stop all active listeners
   */
  public async stopAll(): Promise<void> {
    const removals: Promise<void>[] = []
    for (const [programId, listenerId] of this.listeners) {
      removals.push(
        this.connection.removeOnLogsListener(listenerId).finally(() => {
          this.emit("stopped", programId)
        })
      )
    }
    this.listeners.clear()
    await Promise.allSettled(removals)
  }

  /**
   * Get list of active program listeners
   */
  public listActive(): string[] {
    return Array.from(this.listeners.keys())
  }

  /**
   * Retrieve lightweight runtime stats for a program listener
   */
  public getStats(programId: string): InternalStats | undefined {
    return this.stats.get(programId)
  }

  private bumpStats(programId: string, signature: string, slot: number) {
    const s = this.stats.get(programId)
    if (!s) return
    s.flowsEmitted += 1
    s.lastSignature = signature
    s.lastSlot = slot
  }

  private safeData(obj: unknown): Record<string, unknown> {
    return obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {}
  }

  /**
   * Parse a single log line into a structured variant
   * Handles:
   *  - "Instruction: <Name> {json...}" or "Instruction: <Name> key=value"
   *  - "Program log: {json...}" or "Program log: key=value"
   *  - "consumed N of M compute units"
   */
  private parseLogLine(line: string): ParsedLog {
    // Compute units
    // Examples:
    //  "consumed 12345 of 200000 compute units"
    //  "Program X consumed 34567 of 200000 compute units"
    const cuMatch = line.match(/consumed\s+(\d+)(?:\s+of\s+(\d+))?\s+compute units/i)
    if (cuMatch) {
      return {
        kind: "computeUnits",
        consumed: Number(cuMatch[1]),
        limit: cuMatch[2] ? Number(cuMatch[2]) : undefined,
      }
    }

    // Instruction with optional JSON payload
    const instrPrefix = "Instruction: "
    if (line.includes(instrPrefix)) {
      const raw = line.slice(line.indexOf(instrPrefix) + instrPrefix.length).trim()
      const firstSpace = raw.indexOf(" ")
      const name = firstSpace === -1 ? raw : raw.slice(0, firstSpace)
      const payloadStr = firstSpace === -1 ? "" : raw.slice(firstSpace + 1).trim()

      const payload = this.tryParsePayload(payloadStr)
      return { kind: "instruction", name, payload }
    }

    // Program log with optional JSON payload
    const progPrefix = "Program log: "
    if (line.includes(progPrefix)) {
      const payloadStr = line.slice(line.indexOf(progPrefix) + progPrefix.length).trim()
      const payload = this.tryParsePayload(payloadStr)
      return { kind: "programLog", payload }
    }

    return { kind: "other" }
  }

  private tryParsePayload(s: string): Record<string, unknown> | undefined {
    if (!s) return undefined
    // Try JSON first
    try {
      const obj = JSON.parse(s)
      if (obj && typeof obj === "object") return obj as Record<string, unknown>
    } catch {
      // Not JSON
    }
    // Try simple key=value pairs separated by spaces
    // Example: "key1=abc key2=123"
    const kv: Record<string, unknown> = {}
    let matched = false
    for (const part of s.split(/\s+/)) {
      const i = part.indexOf("=")
      if (i > 0 && i < part.length - 1) {
        matched = true
        const k = part.slice(0, i)
        const v = part.slice(i + 1)
        kv[k] = this.coerce(v)
      }
    }
    return matched ? kv : undefined
  }

  private coerce(v: string): unknown {
    if (/^-?\d+(\.\d+)?$/.test(v)) {
      const n = Number(v)
      return Number.isNaN(n) ? v : n
    }
    if (v === "true") return true
    if (v === "false") return false
    return v
  }
}
