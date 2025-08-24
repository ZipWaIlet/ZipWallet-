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
  sortDesc?: boolean  // defaults to true
}

export class JobPulseService {
  private pulses: JobPulse[] = []
  private readonly maxEntries: number

  constructor(maxEntries = 5000) {
    this.maxEntries = maxEntries
  }

  /**
   * Record a new pulse for a job.
   * Oldest entries are dropped when exceeding maxEntries.
   */
  record(jobId: string, status: JobPulse['status']): void {
    const newPulse: JobPulse = { jobId, status, timestamp: Date.now() }
    this.pulses.push(newPulse)

    if (this.pulses.length > this.maxEntries) {
      const excessEntries = this.pulses.length - this.maxEntries
      // Drop oldest entries in bulk
      this.pulses.splice(0, excessEntries)
    }

    console.log(`Recorded pulse for jobId: ${jobId}, status: ${status}`)
  }

  /**
   * List pulses with optional filtering, sorting, and pagination.
   * Defaults to sorting descending by timestamp.
   */
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

    // Efficient filtering
    if (jobId) result = result.filter(p => p.jobId === jobId)
    if (status) result = result.filter(p => p.status === status)
    if (startTimestamp !== undefined) result = result.filter(p => p.timestamp >= startTimestamp)
    if (endTimestamp !== undefined) result = result.filter(p => p.timestamp <= endTimestamp)

    // Sort the results
    const sorted = result.sort((a, b) => {
      return sortDesc ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
    })

    // Apply pagination limit
    return limit && limit > 0 ? sorted.slice(0, limit) : sorted
  }

  /**
   * Remove all recorded pulses.
   */
  clear(): void {
    const count = this.pulses.length
    this.pulses = []
    console.log(`Cleared ${count} pulses.`)
  }
}
