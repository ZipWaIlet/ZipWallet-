import fetch from "node-fetch"

export interface DepthMetrics {
  midPrice: number
  spreadPercent: number
  totalDepth: number
}

export class DepthAnalyzer {
  constructor(private apiBase: string) {}

  /**  
   * Fetch level-2 book and compute mid price, spread and total depth
   */
  async analyze(symbol: string, levels = 10): Promise<DepthMetrics> {
    const res = await fetch(`${this.apiBase}/markets/${symbol}/orderbook?depth=${levels}`)
    if (!res.ok) throw new Error(`Orderbook fetch failed ${res.status}`)
    const { bids, asks } = (await res.json()) as { bids: [number, number][]; asks: [number, number][] }

    const bestBid = bids[0]?.[0] ?? 0
    const bestAsk = asks[0]?.[0] ?? 0
    const midPrice = (bestBid + bestAsk) / 2
    const spreadPercent = bestBid && bestAsk
      ? ((bestAsk - bestBid) / midPrice) * 100
      : 0

    const depth = [...bids, ...asks]
      .slice(0, levels)
      .reduce((sum, [price, size]) => sum + price * size, 0)

    return {
      midPrice: Number(midPrice.toFixed(6)),
      spreadPercent: Number(spreadPercent.toFixed(2)),
      totalDepth: Number(depth.toFixed(6))
    }
  }
}