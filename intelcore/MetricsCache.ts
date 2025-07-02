export interface Metrics {
  timestamp: number
  solBalance: number
  tokenCount: number
}

export class MetricsCore {
  private history: Metrics[] = []

  record(m: Metrics) {
    this.history.push(m)
  }

  latest(): Metrics | null {
    return this.history.length
      ? this.history[this.history.length - 1]
      : null
  }

  summary() {
    const total = this.history.length
    const avgSol =
      total
        ? this.history.reduce((s, m) => s + m.solBalance, 0) / total
        : 0
    const avgTokens =
      total
        ? this.history.reduce((s, m) => s + m.tokenCount, 0) / total
        : 0
    return { total, avgSol, avgTokens }
  }
}