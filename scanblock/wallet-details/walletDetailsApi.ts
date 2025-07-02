import express from "express"
import { WalletDetailsService } from "./walletDetailsService"

const app = express()
app.use(express.json())

const service = new WalletDetailsService(process.env.SOLANA_RPC_ENDPOINT!)

app.post("/wallet-details", async (req, res) => {
  const { address } = req.body
  if (!address) {
    return res.status(400).json({ success: false, error: "address required" })
  }
  try {
    const details = await service.fetchDetails(address)
    res.json({ success: true, data: details })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.listen(process.env.PORT || 3000, () =>
  console.log(`WalletDetails API listening on port ${process.env.PORT || 3000}`)
)