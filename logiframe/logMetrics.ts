import { LogEntry } from "./logInterpreter"

export interface MetricsSummary {
  total: number
  perLevel: Record<string, number>
  start: Date
  end: Date
}

export class LogMetrics {
  summarize(entries: LogEntry[]): MetricsSummary {
    const counts: Record<string, number> = {}
    entries.forEach(e => {
      counts[e.level] = (counts[e.level] || 0) + 1
    })
    const sorted = entries.slice().sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    return {
      total: entries.length,
      perLevel: counts,
      start: sorted[0]?.timestamp || new Date(),
      end: sorted[sorted.length - 1]?.timestamp || new Date()
    }
  }
}