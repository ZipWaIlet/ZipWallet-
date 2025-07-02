import { BehaviorProfiler, BehaviorProfile, TxRecord } from "./behaviorProfiler"
import { SpreadCalc, SpreadMetrics, Order } from "./spreadCalc"

export interface InspectionResult {
  behavior: BehaviorProfile
  spread: SpreadMetrics
}

export class InspectionRunner {
  constructor(
    private fetchTxs: (addr: string) => Promise<TxRecord[]>,
    private fetchOrderBook: (symbol: string) => Promise<{ bids: Order[]; asks: Order[] }>
  ) {}

  async run(walletAddress: string, symbol: string): Promise<InspectionResult> {
    const txs = await this.fetchTxs(walletAddress)
    const behavior = BehaviorProfiler.analyze(txs)
    const { bids, asks } = await this.fetchOrderBook(symbol)
    const spread = SpreadCalc.compute(bids, asks)
    return { behavior, spread }
  }
}