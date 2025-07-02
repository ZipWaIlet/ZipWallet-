import express from "express"
import { LogHubService } from "./logHubService"
import { LogInterpreter } from "./logInterpreter"
import { LogMetrics } from "./logMetrics"

const app = express()
app.use(express.json())

const hub = new LogHubService(process.env.LOG_DIR || "./logs")
const interpreter = new LogInterpreter()
const metrics = new LogMetrics()

app.get("/logs", async (req, res) => {
  try {
    const files = await hub.listFiles()
    res.json({ success: true, files })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.get("/logs/:file", async (req, res) => {
  try {
    const raw = await hub.readFile(req.params.file)
    const entries = interpreter.parse(raw)
    const summary = metrics.summarize(entries)
    res.json({ success: true, entries, summary })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`LogHub API running on port ${port}`))