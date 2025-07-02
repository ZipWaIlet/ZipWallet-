import express from "express"
import { ScanBlockService } from "./scanBlockService"
import { ScanBlockAnalyzer } from "./scanBlockAnalyzer"

const app = express()
app.use(express.json())

const service = new ScanBlockService(process.env.SOLANA_RPC_ENDPOINT!)
const analyzer = new ScanBlockAnalyzer()

app.post("/scanblock", async (req, res) => {
  const { address, limit } = req.body
  if (!address) {
    return res.status(400).json({ success: false, error: "address required" })
  }
  try {
    const txs = await service.fetchTransactions(address, limit || 50)
    const metrics = analyzer.analyze(txs)
    res.json({ success: true, metrics, transactions: txs.length })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.listen(process.env.PORT || 3000, () =>
  console.log(`ScanBlock API listening on port ${process.env.PORT || 3000}`)
)