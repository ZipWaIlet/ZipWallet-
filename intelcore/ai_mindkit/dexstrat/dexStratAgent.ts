import { DexStratService, Signal } from "./dexStratService"
import { PublicKey } from "@solana/web3.js"

export interface AgentInput {
  baseMint: string
  quoteMint: string
  windowShort: number
  windowLong: number
}

export interface AgentOutput {
  signal: Signal
}

export class DexStratAgent {
  private service: DexStratService

  constructor(rpcUrl: string) {
    this.service = new DexStratService(rpcUrl)
  }

  async run(input: AgentInput): Promise<AgentOutput> {
    const { baseMint, quoteMint, windowShort, windowLong } = input
    // validate mints
    const base = new PublicKey(baseMint)
    const quote = new PublicKey(quoteMint)
    // fetch and compute signal
    const signal = await this.service.computeCrossoverSignal(
      base.toBase58(),
      quote.toBase58(),
      windowShort,
      windowLong
    )
    return { signal }
  }
}