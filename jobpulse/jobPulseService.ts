export interface JobPulse {
  jobId: string
  timestamp: number
  status: "pending" | "running" | "completed" | "failed"
}

export class JobPulseService {
  private pulses: JobPulse[] = []

  record(jobId: string, status: JobPulse["status"]): void {
    this.pulses.push({ jobId, status, timestamp: Date.now() })
  }

  list(jobId?: string): JobPulse[] {
    return jobId
      ? this.pulses.filter(p => p.jobId === jobId)
      : [...this.pulses]
  }
}