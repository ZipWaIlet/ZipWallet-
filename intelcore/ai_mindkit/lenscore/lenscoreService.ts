import { Connection, PublicKey, ConfirmedSignatureInfo, ParsedAccountData } from "@solana/web3.js"

export interface TimePoint {
  timestamp: number
  transferCount: number
  totalSupply: number
}

export class LensCoreService {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  async fetchSeries(mint: string, limit = 100): Promise<TimePoint[]> {
    const key = new PublicKey(mint)
    const sigs: ConfirmedSignatureInfo[] = await this.conn.getSignaturesForAddress(key, { limit })
    const series: TimePoint[] = []

    for (const { signature, blockTime } of sigs) {
      if (!blockTime) continue
      const tx = await this.conn.getParsedConfirmedTransaction(signature)
      if (!tx) continue

      // Count transfer instructions
      const transferCount = tx.transaction.message.instructions.filter(
        instr => (instr as any).program === "spl-token" && (instr as any).parsed?.type === "transfer"
      ).length

      // Compute total supply by summing UI amounts
      const accounts = await this.conn.getParsedTokenAccountsByOwner(key, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
      })
      const totalSupply = accounts.value.reduce((sum, acc) => {
        const amt = (acc.account.data as ParsedAccountData).parsed.info.tokenAmount.uiAmount as number
        return sum + amt
      }, 0)

      series.push({ timestamp: blockTime * 1000, transferCount, totalSupply })
    }

    return series.sort((a, b) => a.timestamp - b.timestamp)
  }
}