import fetch from "node-fetch"

export interface DealParameters {
  symbol: string
  amountIn: number
  minAmountOut: number
  slippagePct?: number
}

export interface SwapQuote {
  inputMint: string
  outputMint: string
  amountIn: number
  estimatedAmountOut: number
  fee: number
}

export interface DealResult {
  success: boolean
  signature?: string
  error?: string
}

export class DexDeal {
  constructor(private apiBase: string, private rpcUrl: string) {}

  async fetchQuote(params: DealParameters): Promise<SwapQuote> {
    const res = await fetch(
      `${this.apiBase}/quote?symbol=${params.symbol}&amount=${params.amountIn}`
    )
    if (!res.ok) throw new Error(`Quote fetch failed: ${res.statusText}`)
    const json = await res.json()
    const fee = json.fee || 0
    return {
      inputMint: json.inputMint,
      outputMint: json.outputMint,
      amountIn: params.amountIn,
      estimatedAmountOut: json.estimatedAmountOut,
      fee
    }
  }

  async executeDeal(params: DealParameters): Promise<DealResult> {
    try {
      const quote = await this.fetchQuote(params)
      if (params.minAmountOut > quote.estimatedAmountOut) {
        return { success: false, error: "Slippage tolerance exceeded" }
      }

      const txRes = await fetch(`${this.apiBase}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputMint: quote.inputMint,
          outputMint: quote.outputMint,
          amountIn: quote.amountIn,
          minAmountOut: params.minAmountOut,
          rpcUrl: this.rpcUrl
        })
      })
      if (!txRes.ok) {
        const err = await txRes.text()
        return { success: false, error: `Swap failed: ${err}` }
      }
      const { signature } = await txRes.json()
      return { success: true, signature }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }
}
