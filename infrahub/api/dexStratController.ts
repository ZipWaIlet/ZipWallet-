import { Router, Request, Response } from "express"
import { z } from "zod"
import { DexStratService } from "./dexStratService"

// -------- Types --------
type Signal = "buy" | "sell" | "hold"
interface SignalResponse {
  success: boolean
  data?: { signal: Signal }
  error?: string | unknown
}

// -------- Validation --------
const bodySchema = z
  .object({
    baseMint: z.string().min(32, "baseMint is invalid").max(64),
    quoteMint: z.string().min(32, "quoteMint is invalid").max(64),
    windowShort: z.coerce.number().int().positive(),
    windowLong: z.coerce.number().int().positive(),
  })
  .refine((v) => v.windowShort < v.windowLong, {
    message: "windowShort must be less than windowLong",
    path: ["windowShort"],
  })

// -------- Helpers --------
const ok = (res: Response<SignalResponse>, signal: Signal, status = 200) =>
  res.status(status).json({ success: true, data: { signal } })

const fail = (res: Response<SignalResponse>, status: number, error: string | unknown) =>
  res.status(status).json({ success: false, error })

// -------- Router factory (DI friendly) --------
export function createDexStratRouter(service?: DexStratService): Router {
  const router = Router()
  const svc =
    service ??
    new DexStratService(
      (() => {
        const base = process.env.DEXSTRAT_API_BASE
        if (!base) {
          throw new Error("DEXSTRAT_API_BASE is not set")
        }
        return base
      })()
    )

  /**
   * POST /signal
   * Body: { baseMint: string, quoteMint: string, windowShort: number, windowLong: number }
   * Returns: { success: boolean, data: { signal: "buy"|"sell"|"hold" } }
   */
  router.post(
    "/signal",
    async (req: Request, res: Response<SignalResponse>) => {
      try {
        const { baseMint, quoteMint, windowShort, windowLong } = bodySchema.parse(req.body)

        const signal = await svc.computeCrossoverSignal(
          baseMint.trim(),
          quoteMint.trim(),
          windowShort,
          windowLong
        )

        return ok(res, signal)
      } catch (err) {
        if (err instanceof z.ZodError) {
          return fail(res, 400, err.issues.map((i) => i.message).join("; "))
        }
        return fail(res, 500, err instanceof Error ? err.message : String(err))
      }
    }
  )

  return router
}

// -------- Default export using env-backed service --------
const defaultRouter = createDexStratRouter()
export default defaultRouter
