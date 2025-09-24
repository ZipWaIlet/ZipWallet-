export interface JobPulse {
  jobId: string
  timestamp: number
  status: 'pending' | 'running' | 'completed' | 'failed'
}

export interface ListOptions {
  jobId?: string
  status?: JobPulse['status']
  startTimestamp?: number
  endTimestamp?: number
  limit?: number
  sortDesc?: boolean
}

export class JobPulseService {
  private pulses: JobPulse[] = []
  private readonly maxEntries: number

  constructor(maxEntries = 5000) {
    this.maxEntries = maxEntries
  }

  record(jobId: string, status: JobPulse['status']): void {
    const newPulse: JobPulse = { jobId, status, timestamp: Date.now() }
    this.pulses.push(newPulse)

    if (this.pulses.length > this.maxEntries) {
      const excess = this.pulses.length - this.maxEntries
      this.pulses.splice(0, excess)
    }

    console.info("JobPulseService.record", { jobId, status })
  }

  list(options: ListOptions = {}): JobPulse[] {
    const {
      jobId,
      status,
      startTimestamp,
      endTimestamp,
      limit,
      sortDesc = true,
    } = options

    let result = this.pulses

    if (jobId) result = result.filter(p => p.jobId === jobId)
    if (status) result = result.filter(p => p.status === status)
    if (startTimestamp !== undefined) result = result.filter(p => p.timestamp >= startTimestamp)
    if (endTimestamp !== undefined) result = result.filter(p => p.timestamp <= endTimestamp)

    const sorted = result
      .slice() // avoid mutating original
      .sort((a, b) => sortDesc ? b.timestamp - a.timestamp : a.timestamp - b.timestamp)

    return limit && limit > 0 ? sorted.slice(0, limit) : sorted
  }

  latest(jobId: string): JobPulse | null {
    const found = this.list({ jobId, limit: 1, sortDesc: true })
    return found.length > 0 ? found[0] : null
  }

  clear(): void {
    const count = this.pulses.length
    this.pulses = []
    console.info("JobPulseService.clear", { count })
  }
}
