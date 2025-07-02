
import express from "express"
import { BalEyeService } from "./baleyeService"

const app = express()
app.use(express.json())

const service = new BalEyeService(process.env.SOLANA_RPC_ENDPOINT!)

app.post("/baleye/track", async (req, res) => {
  const { wallet, mint = "SOL", samples = 10, intervalMs = 5000 } = req.body
  if (!wallet) {
    return res.status(400).json({ success: false, error: "wallet required" })
  }
  try {
    const data = await service.track(wallet, mint, samples, intervalMs)
    res.json({ success: true, data })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.listen(process.env.PORT || 3000, () =>
  console.log(`BalEye API listening on port ${process.env.PORT || 3000}`)
)
