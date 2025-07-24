import express, { Request, Response, NextFunction } from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import rateLimit from "express-rate-limit"
import compression from "compression"
import "express-async-errors" // catch async errors
import dexStratController from "./dexStratController"
import swaggerUi from "swagger-ui-express"
import swaggerDocument from "./swagger.json"

const app = express()

// Load env vars early
import dotenv from "dotenv"
dotenv.config()

// Security middleware
app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }))
app.use(compression())

// Logging
app.use(morgan("combined"))

// Rate limiting
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // max 100 requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
  })
)

// JSON parsing
app.use(express.json({ limit: "100kb" }))

// Swagger API docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument))

// Healthcheck
app.get("/ping", (_req: Request, res: Response) => {
  res.status(200).send("pong")
})

// DexStrat routes, with basic input validation middleware
app.use(
  "/dexstrat",
  (req: Request, res: Response, next: NextFunction) => {
    // Example: ensure JSON body exists for POST/PUT
    if (["POST", "PUT"].includes(req.method) && !req.is("application/json")) {
      return res.status(415).json({ error: "Unsupported Media Type, use application/json" })
    }
    next()
  },
  dexStratController
)

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" })
})

// Global error handler
app.use(
  (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled Error:", err)
    const status = err.statusCode || 500
    const message = err.message || "Internal Server Error"
    res.status(status).json({ error: message })
  }
)

// Start server with graceful shutdown
const PORT = parseInt(process.env.PORT || "3000", 10)
const server = app.listen(PORT, () => {
  console.log(`🚀 DexStrat API listening on port ${PORT}`)
})

// Graceful shutdown
const shutdown = () => {
  console.log("🛑 Shutting down server...")
  server.close(() => {
    console.log("🛑 Server closed")
    process.exit(0)
  })
  setTimeout(() => {
    console.error("🛑 Forcing shutdown")
    process.exit(1)
  }, 10_000)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
