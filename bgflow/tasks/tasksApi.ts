import express from "express"
import { TasksService } from "./tasksService"
import { z } from "zod"

const app = express()
app.use(express.json())

const service = new TasksService()

const createSchema = z.object({
  title: z.string().min(1),
  payload: z.any().optional()
})

app.post("/tasks", (req, res) => {
  const result = createSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.issues })
  }
  const { title, payload } = result.data
  const task = service.create(title, payload)
  res.status(201).json({ success: true, task })
})

app.get("/tasks", (_req, res) => {
  res.json({ success: true, tasks: service.list() })
})

app.delete("/tasks/:id", (req, res) => {
  const { id } = req.params
  if (!service.remove(id)) {
    return res.status(404).json({ success: false, error: "Task not found" })
  }
  res.json({ success: true })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Tasks API listening on port ${PORT}`)
})