export interface JobPulse {
  jobId: string
  timestamp: number
  status: "pending" | "running" | "completed" | "failed"
}

export interface ListOptions {
  jobId?: string
  status?: JobPulse["status"]
  limit?: number
  sortDesc?: boolean
}

export class JobPulseService {
  private pulses: JobPulse[] = []
  private maxEntries = 5000 // prevent unbounded growth

  /**
   * Records a new pulse for a job
   * @param jobId - Job identifier
   * @param status - Status update
   */
  record(jobId: string, status: JobPulse["status"]): void {
    const pulse: JobPulse = {
      jobId,
      status,
      timestamp: Date.now()
    }

    this.pulses.push(pulse)

    if (this.pulses.length > this.maxEntries) {
      this.pulses.shift() // remove oldest
    }
  }

  /**
   * Lists job pulses with optional filters
   * @param options - Filtering and sorting options
   * @returns Filtered list of pulses
   */
  list(options: ListOptions = {}): JobPulse[] {
    let result = this.pulses

    if (options.jobId) {
      result = result.filter(p => p.jobId === options.jobId)
    }

    if (options.status) {
      result = result.filter(p => p.status === options.status)
    }

    if (options.sortDesc) {
      result = [...result].sort((a, b) => b.timestamp - a.timestamp)
    }

    if (options.limit && options.limit > 0) {
      result = result.slice(0, options.limit)
    }

    return result
  }

  /**
   * Clears all pulses (use with caution)
   */
  clear(): void {
    this.pulses = []
  }
}
