import { z } from "zod"
import { PublicKey } from "@solana/web3.js"
import { VaultCoreEngine } from "./vaultCoreEngine"
import type { ExecutionContext } from "./types"

/** Common helpers */
const publicKeyString = z
  .string()
  .trim()
  .refine((s) => {
    try {
      // Constructing will throw if invalid
      // No randomness, deterministic validation
      new PublicKey(s)
      return true
    } catch {
      return false
    }
  }, "Invalid public key")

const positiveAmount = z.number().positive().finite()

/** Action payload schemas */
const getWalletSchema = z.object({})
const balanceSchema = z.object({ mintAddress: publicKeyString })
const allSchema = z.object({})
const transferSchema = z.object({
  recipient: publicKeyString,
  amount: positiveAmount,
  mintAddress: publicKeyString,
})

/** Action ids */
export const VaultActionIds = {
  GetWallet: "getWallet",
  GetBalance: "getBalance",
  GetAllBalances: "getAllBalances",
  Transfer: "transfer",
} as const
export type VaultActionId = typeof VaultActionIds[keyof typeof VaultActionIds]

/** Unified response envelope */
type ActionResult<T> = {
  notice: string
  data?: T
  error?: string
  meta?: {
    actionId: VaultActionId | string
    tookMs: number
    ts: string
  }
}

/** Type-level mapping for action results */
type ActionDataMap = {
  [VaultActionIds.GetWallet]: { walletAddress: string }
  [VaultActionIds.GetBalance]: { balance: number }
  [VaultActionIds.GetAllBalances]: { balances: Array<{ mint: string; balance: number }> }
  [VaultActionIds.Transfer]: { txSignature: string }
}

function nowIso() {
  return new Date().toISOString()
}

function normalizePubkey(input: PublicKey | string): PublicKey {
  return input instanceof PublicKey ? input : new PublicKey(input)
}

export class VaultActionHandler {
  private engine: VaultCoreEngine

  constructor(engine: VaultCoreEngine) {
    this.engine = engine
  }

  /**
   * Handle an action by its ID with validated payload
   * Returns structured result with timing metadata
   */
  public async handle<K extends VaultActionId>(
    actionId: K | string,
    payload: unknown,
    ctx: ExecutionContext
  ): Promise<ActionResult<ActionDataMap[VaultActionId]>> {
    const started = Date.now()
    try {
      switch (actionId) {
        case VaultActionIds.GetWallet: {
          getWalletSchema.parse(payload)
          const owner = normalizePubkey(ctx.walletPubkey)
          const address = await this.engine.getWalletAddress(owner)
          return this.ok(actionId, started, { walletAddress: address })
        }

        case VaultActionIds.GetBalance: {
          const { mintAddress } = balanceSchema.parse(payload)
          const owner = normalizePubkey(ctx.walletPubkey)
          const balance = await this.engine.getBalance(owner, mintAddress)
          return this.ok(actionId, started, { balance })
        }

        case VaultActionIds.GetAllBalances: {
          allSchema.parse(payload)
          const owner = normalizePubkey(ctx.walletPubkey)
          const balances = await this.engine.getAllBalances(owner)
          return this.ok(actionId, started, { balances })
        }

        case VaultActionIds.Transfer: {
          const { recipient, amount, mintAddress } = transferSchema.parse(payload)
          const owner = normalizePubkey(ctx.walletPubkey)
          const recipientPubkey = new PublicKey(recipient)
          const txSignature = await this.engine.transfer(owner, recipientPubkey, mintAddress, amount)
          return this.ok(actionId, started, { txSignature })
        }

        default:
          return this.fail(actionId, started, `Unsupported action: ${actionId}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return this.fail(actionId, started, message)
    }
  }

  private ok<T>(actionId: VaultActionId | string, started: number, data: T): ActionResult<T> {
    const tookMs = Date.now() - started
    return {
      notice: "OK",
      data,
      meta: { actionId, tookMs, ts: nowIso() },
    }
  }

  private fail<T>(
    actionId: VaultActionId | string,
    started: number,
    error: string
  ): ActionResult<T> {
    const tookMs = Date.now() - started
    return {
      notice: "Action failed",
      error,
      meta: { actionId, tookMs, ts: nowIso() },
    }
  }
}
