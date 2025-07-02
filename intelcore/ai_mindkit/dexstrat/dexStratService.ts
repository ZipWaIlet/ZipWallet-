import fetch from "node-fetch"
import { Order } from "@dex/api-types"

export type Signal = "buy" | "sell" | "hold"

export class DexStratService {
  constructor(private apiBase: string) {}

  private async fetchPrices(mintA: string, mintB: string, limit: number): Promise<number[]> {
    const res = await fetch(`${this.apiBase}/markets/${mintA}-${mintB}/trades?limit=${limit}`)
    if (!res.ok) throw new Error(`Fetch error ${res.status}`)
    const trades: { price: number }[] = await res.json()
    return trades.map(t => t.price)
  }

  /** 
   * Compute moving-average crossover signal.
   * Returns "buy" if shortMA > longMA and was below previously,
   * "sell" if shortMA < longMA and was above previously,
   * otherwise "hold".
   */
  async computeCrossoverSignal(
    baseMint: string,
    quoteMint: string,
    windowShort: number,
    windowLong: number
  ): Promise<Signal> {
    const prices = await this.fetchPrices(baseMint, quoteMint, windowLong + 1)
    if (prices.length < windowLong + 1) return "hold"

    const sliceShort = prices.slice(-windowShort)
    const sliceLong = prices.slice(-windowLong)

    const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length

    const shortMA = avg(sliceShort)
    const longMA = avg(sliceLong)
    // previous short and long for crossover detection
    const prevShortMA = avg(prices.slice(-windowShort - 1, -1))
    const prevLongMA = avg(prices.slice(-windowLong - 1, -1))

    if (prevShortMA <= prevLongMA && shortMA > longMA) return "buy"
    if (prevShortMA >= prevLongMA && shortMA < longMA) return "sell"
    return "hold"
  }
}