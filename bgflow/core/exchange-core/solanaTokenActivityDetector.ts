
import { ScanNewTokenAccounts, NewAccountEvent } from "./scanNewTokenAccounts"
import { PatternDetector } from "./patternDetector"

export interface ActivityAnomaly {
  type: "burst" | "newAccountSpike"
  details: any
}

export class SolanaTokenActivityDetector {
  private accountScanner: ScanNewTokenAccounts
  private patternDetector: PatternDetector

  constructor(rpcUrl: string) {
    this.accountScanner = new ScanNewTokenAccounts(rpcUrl)
    this.patternDetector = new PatternDetector()
  }

  /**
   * Detect anomalies in token activity:
   *  • Bursts in transfer volume (using PatternDetector)
   *  • Spikes in new account creations
   */
  async detect(mint: string, transferSeries: Array<[number, number]>, threshold = 2): Promise<ActivityAnomaly[]> {
    const anomalies: ActivityAnomaly[] = []

    // detect transfer bursts
    const burst = this.patternDetector.detect(transferSeries)
    if (burst) {
      anomalies.push({ type: "burst", details: burst })
    }

    // detect new account spikes
    const events: NewAccountEvent[] = await this.accountScanner.fetchNewAccounts(mint, 200)
    // bucket by minute
    const counts: Record<number, number> = {}
    for (const e of events) {
      const minute = Math.floor(e.timestamp / 60000) * 60000
      counts[minute] = (counts[minute] || 0) + 1
    }
    const series = Object.entries(counts).map(([ts, cnt]) => [Number(ts), cnt] as [number, number])
    const newAccountBurst = this.patternDetector.detect(series)
    if (newAccountBurst) {
      anomalies.push({ type: "newAccountSpike", details: newAccountBurst })
    }

    return anomalies
  }
}
