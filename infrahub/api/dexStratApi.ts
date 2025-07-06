import express from "express"
import cors from "cors"
import helmet from "helmet"
import "express-async-errors" // ensures async errors are caught
import dexStratController from "./dexStratController"

const app = express()

// Security and middleware
app.use(cors())
app.use(helmet())
app.use(express.json())

// Healthcheck
app.get("/ping", (_req, res) => {
  res.status(200).send("pong")
})

// DexStrat routes
app.use("/dexstrat", dexStratController)

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled Error:", err)
  res.status(500).json({ error: "Internal Server Error" })
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 DexStrat API listening on port ${PORT}`)
})
