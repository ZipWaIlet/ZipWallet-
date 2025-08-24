export interface LogEntry {
  timestamp: Date
  level: string
  message: string
  metadata?: Record<string, any>
}

export class LogInterpreter {
  private static readonly logPattern = /^\[(.+?)\]\s+(\w+):\s+(.*?)(\s+\{.*\})?$/

  parse(raw: string): LogEntry[] {
    const lines = raw.split(/\r?\n/).filter(Boolean)
    return lines.map(line => this.parseLine(line))
  }

  private parseLine(line: string): LogEntry {
    const match = line.match(LogInterpreter.logPattern)
    if (!match) {
      console.warn(`Skipping invalid log entry: ${line}`)
      return { timestamp: new Date(), level: "unknown", message: line }
    }
    
    const [, ts, lvl, msg, meta] = match
    let metadata: Record<string, any> | undefined

    try {
      metadata = meta ? JSON.parse(meta.trim()) : undefined
    } catch (e) {
      console.error(`Error parsing metadata for line: ${line}.`, e)
      metadata = undefined
    }

    // Parsing the timestamp with additional error handling
    let timestamp: Date
    try {
      timestamp = new Date(ts)
      if (isNaN(timestamp.getTime())) {
        throw new Error(`Invalid timestamp: ${ts}`)
      }
    } catch (e) {
      console.error(`Error parsing timestamp: ${ts}. Falling back to current date.`, e)
      timestamp = new Date() // fallback to current date
    }

    return { timestamp, level: lvl, message: msg.trim(), metadata }
  }
}
