import express from "express"
import { GrabBalanceService } from "./BalanceService"

const app = express()
app.use(express.json())

const service = new GrabBalanceService(process.env.SOLANA_RPC_ENDPOINT!)

app.post("/grabbal", async (req, res) => {
  const { address } = req.body
  if (!address) {
    return res.status(400).json({ success: false, error: "address required" })
  }
  try {
    const balances = await service.fetch(address)
    res.json({ success: true, data: balances })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.listen(process.env.PORT || 3000, () =>
  console.log(`GrabBal API listening on port ${process.env.PORT || 3000}`)
)