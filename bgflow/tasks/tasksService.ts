import { z } from "zod"

export interface Task {
  id: string
  title: string
  payload?: unknown
  createdAt: number
}

export class TasksService {
  private tasks: Task[] = []

  create(title: string, payload?: unknown): Task {
    const task: Task = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      payload,
      createdAt: Date.now()
    }
    this.tasks.push(task)
    return task
  }

  list(): Task[] {
    return [...this.tasks]
  }

  remove(id: string): boolean {
    const before = this.tasks.length
    this.tasks = this.tasks.filter(t => t.id !== id)
    return this.tasks.length < before
  }
}