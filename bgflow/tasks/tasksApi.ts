import express, { Request, Response, NextFunction } from "express"
import "express-async-errors"
import { z, ZodError } from "zod"
import { TasksService, Task } from "./tasksService"

const app = express()
app.use(express.json())

const service = new TasksService()

// ——— Validation Schemas ———
const createSchema = z.object({
  title: z.string().min(1),
  payload: z.any().optional(),
})
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  payload: z.any().optional(),
})

// ——— Middleware for Zod validation ———
function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      throw new ZodError(result.error.issues)
    }
    req.body = result.data
    next()
  }
}

// ——— Routes ———
const router = express.Router()

// Create a new task
router.post(
  "/",
  validateBody(createSchema),
  async (req: Request, res: Response) => {
    const { title, payload } = req.body as { title: string; payload?: any }
    const task: Task = service.create(title, payload)
    res.status(201).json({ success: true, task })
  }
)

// List all tasks
router.get("/", async (_req: Request, res: Response) => {
  const tasks: Task[] = service.list()
  res.json({ success: true, tasks })
})

// Get a single task by ID
router.get("/:id", async (req: Request, res: Response) => {
  const task = service.get(req.params.id)
  if (!task) {
    return res.status(404).json({ success: false, error: "Task not found" })
  }
  res.json({ success: true, task })
})

// Update a task
router.put(
  "/:id",
  validateBody(updateSchema),
  async (req: Request, res: Response) => {
    const updated = service.update(req.params.id, req.body)
    if (!updated) {
      return res.status(404).json({ success: false, error: "Task not found" })
    }
    res.json({ success: true, task: updated })
  }
)

// Delete a task
router.delete("/:id", async (req: Request, res: Response) => {
  const removed = service.remove(req.params.id)
  if (!removed) {
    return res.status(404).json({ success: false, error: "Task not found" })
  }
  res.json({ success: true })
})

app.use("/tasks", router)

// ——— Global Error Handler ———
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      errors: err.issues.map(({ path, message }) => ({ field: path.join("."), message })),
    })
  }
  console.error(err)
  res.status(500).json({ success: false, error: "Internal Server Error" })
})

// ——— Server Start ———
const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
  console.log(`Tasks API listening on port ${PORT}`)
})
