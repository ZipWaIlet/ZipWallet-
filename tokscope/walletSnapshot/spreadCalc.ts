export interface Order { price: number; size: number }
export interface SpreadMetrics {
  midPrice: number
  spreadPct: number
}

export class SpreadCalc {
  static compute(bids: Order[], asks: Order[]): SpreadMetrics {
    const bestBid = bids[0]?.price ?? 0
    const bestAsk = asks[0]?.price ?? 0
    const midPrice = (bestBid + bestAsk) / 2
    const spreadPct = bestBid && bestAsk
      ? ((bestAsk - bestBid) / midPrice) * 100
      : 0
    return { midPrice, spreadPct: Number(spreadPct.toFixed(2)) }
  }
}