import express from "express"
import { ShifterFetch } from "./shifterFetch"
import { ShifterAnalyzer } from "./shifterAnalyzer"

const app = express()
app.use(express.json())

const fetcher = new ShifterFetch(process.env.SOLANA_RPC_ENDPOINT!)
const analyzer = new ShifterAnalyzer()

app.post("/shifter", async (req, res) => {
  try {
    const { mint, limit } = req.body
    if (!mint) return res.status(400).json({ success: false, error: "mint required" })

    const records = await fetcher.records(mint, limit || 100)
    const summary = analyzer.summarize(records)
    res.json({ success: true, summary, records })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.listen(process.env.PORT || 3000, () =>
  console.log(`Shifter API listening on port ${process.env.PORT || 3000}`)
)