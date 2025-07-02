export interface TxRecord {
  timestamp: number
  amount: number
  direction: "in" | "out"
}

export interface BehaviorProfile {
  firstSeen: number
  lastSeen: number
  totalIn: number
  totalOut: number
  avgTxSize: number
}

export class BehaviorProfiler {
  static analyze(records: TxRecord[]): BehaviorProfile {
    if (records.length === 0) {
      return { firstSeen: 0, lastSeen: 0, totalIn: 0, totalOut: 0, avgTxSize: 0 }
    }
    const sorted = records.slice().sort((a, b) => a.timestamp - b.timestamp)
    const totalIn = records.filter(r => r.direction === "in").reduce((s, r) => s + r.amount, 0)
    const totalOut = records.filter(r => r.direction === "out").reduce((s, r) => s + r.amount, 0)
    const avgTxSize = records.reduce((s, r) => s + r.amount, 0) / records.length
    return {
      firstSeen: sorted[0].timestamp,
      lastSeen: sorted[sorted.length - 1].timestamp,
      totalIn,
      totalOut,
      avgTxSize: Number(avgTxSize.toFixed(4))
    }
  }
}