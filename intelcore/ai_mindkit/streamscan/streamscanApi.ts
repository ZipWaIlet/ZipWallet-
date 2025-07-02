import express from "express"
import { StreamScanService, StreamEvent } from "./streamscanService"

const app = express()
app.use(express.json())

const service = new StreamScanService(process.env.SOLANA_RPC_ENDPOINT!)

app.post("/streamscan", async (req, res) => {
  const { address, limit } = req.body
  if (typeof address !== "string") {
    return res.status(400).json({ success: false, error: "address required" })
  }
  try {
    const events: StreamEvent[] = await service.stream(address, limit || 100)
    res.json({ success: true, events })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.listen(process.env.PORT || 3000, () =>
  console.log(`StreamScan API listening on port ${process.env.PORT || 3000}`)
)