import { Router, Request, Response } from "express"
import { DexStratService } from "./dexStratService"

const router = Router()
const service = new DexStratService(process.env.DEXSTRAT_API_BASE!)

/**
 * POST /signal
 * Body: { baseMint: string, quoteMint: string, windowShort: number, windowLong: number }
 * Returns: { success: boolean, signal: "buy"|"sell"|"hold" }
 */
router.post("/signal", async (req: Request, res: Response) => {
  try {
    const { baseMint, quoteMint, windowShort, windowLong } = req.body
    if (!baseMint || !quoteMint || !windowShort || !windowLong) {
      return res.status(400).json({ success: false, error: "Missing parameters" })
    }
    const signal = await service.computeCrossoverSignal(
      baseMint,
      quoteMint,
      Number(windowShort),
      Number(windowLong)
    )
    res.json({ success: true, signal })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router