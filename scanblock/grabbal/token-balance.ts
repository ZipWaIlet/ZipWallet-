import express, { Request, Response, NextFunction } from "express"
import { GrabBalanceService } from "./BalanceService"
import { PublicKey } from "@solana/web3.js"
import { z } from "zod"

// ---- Config ----
const PORT = Number(process.env.PORT ?? 3000)
const RPC = process.env.SOLANA_RPC_ENDPOINT
const REQ_TIMEOUT_MS = Number(process.env.GRABBAL_TIMEOUT_MS ?? 10_000)

if (!RPC) {
  // Fail fast if RPC is not configured
  // Do not throw inside top-level await: log and exit
  // eslint-disable-next-line no-console
  console.error("[startup] Missing SOLANA_RPC_ENDPOINT env")
  process.exit(1)
}

// ---- App ----
const app = express()
app.use(express.json({ limit: "256kb" }))

// Minimal request logger
app.use((req, _res, next) => {
  const t = new Date().toISOString()
  // eslint-disable-next-line no-console
  console.log(`[${t}] ${req.method} ${req.originalUrl}`)
  next()
})

const service = new GrabBalanceService(RPC)

// ---- Utils ----
const postSchema = z.object({
  address: z
    .string()
    .trim()
    .refine((s) => {
      try {
        new PublicKey(s)
        return true
      } catch {
        return false
      }
    }, "invalid Solana address"),
})

const asyncHandler =
  <T extends Request, U extends Response>(fn: (req: T, res: U) => Promise<any>) =>
  (req: T, res: U, next: NextFunction) =>
    fn(req, res).catch(next)

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error("request timeout"))
      }
    }, ms)
    p.then((v) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve(v)
      }
    }).catch((e) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(e)
      }
    })
  })
}

// ---- Routes ----

// Healthcheck
app.get("/health", (_req, res) => {
  res.json({ ok: true, rpcConfigured: Boolean(RPC), time: new Date().toISOString() })
})

// Versioned endpoint
app.post(
  "/v1/grabbal",
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = postSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "validation_error",
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      })
    }

    const address = parsed.data.address
    const startedAt = Date.now()

    try {
      const data = await withTimeout(service.fetch(address), REQ_TIMEOUT_MS)
      const tookMs = Date.now() - startedAt
      return res.json({
        success: true,
        data,
        meta: { address, tookMs, ts: new Date().toISOString() },
      })
    } catch (e: any) {
      const tookMs = Date.now() - startedAt
      const message = e?.message ?? "unknown error"
      const status = message.includes("timeout") ? 504 : 500
      return res.status(status).json({
        success: false,
        error: message,
        meta: { address, tookMs, ts: new Date().toISOString() },
      })
    }
  })
)

// Back-compat alias for old path
app.post(
  "/grabbal",
  (req, res, next) => {
    // forward to the new handler
    ;(req.url as any) = "/v1/grabbal"
    next()
  },
  app._router
)

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error("[unhandled]", err)
  res.status(500).json({ success: false, error: "internal_error" })
})

// Startup
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`GrabBal API listening on port ${PORT}`)
})
