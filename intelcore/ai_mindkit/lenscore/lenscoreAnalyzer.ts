import { TimePoint } from "./lenscoreService"

export interface MetricsSummary {
  averageTransfers: number
  maxSupply: number
  volatility: number
}

export class LensCoreAnalyzer {
  summarize(series: TimePoint[]): MetricsSummary {
    const transfers = series.map(p => p.transferCount)
    const supplies  = series.map(p => p.totalSupply)

    const avgTrans = transfers.reduce((s, v) => s + v, 0) / (transfers.length || 1)
    const maxSupply = Math.max(...supplies, 0)

    // Volatility of transfer activity (std dev of transfers)
    const mean = avgTrans
    const variance = transfers.reduce((s, v) => s + (v - mean) ** 2, 0) / (transfers.length || 1)
    const volatility = Math.sqrt(variance)

    return {
      averageTransfers: Number(avgTrans.toFixed(2)),
      maxSupply: Number(maxSupply.toFixed(2)),
      volatility: Number(volatility.toFixed(2))
    }
  }
}