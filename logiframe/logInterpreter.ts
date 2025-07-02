export interface LogEntry {
  timestamp: Date
  level: string
  message: string
  metadata?: Record<string, any>
}

export class LogInterpreter {
  parse(raw: string): LogEntry[] {
    const lines = raw.split(/\r?\n/).filter(Boolean)
    return lines.map(line => {
      const match = line.match(/^\[(.+?)\]\s+(\w+):\s+(.*?)(\s+\{.*\})?$/)
      if (!match) {
        return { timestamp: new Date(), level: "unknown", message: line }
      }
      const [, ts, lvl, msg, meta] = match
      let metadata
      try {
        metadata = meta ? JSON.parse(meta.trim()) : undefined
      } catch {
        metadata = undefined
      }
      return { timestamp: new Date(ts), level: lvl, message: msg.trim(), metadata }
    })
  }
}