
import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js"

export interface BalancePoint {
  timestamp: number
  balance: number
}

export class BalEyeService {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  /** Fetches current balance (SOL or SPL) for the given wallet and mint */
  private async fetchBalance(
    wallet: string,
    mint: string
  ): Promise<number> {
    const pub = new PublicKey(wallet)
    if (mint === "SOL") {
      const lamports = await this.conn.getBalance(pub)
      return lamports / 1e9
    } else {
      const mintKey = new PublicKey(mint)
      const ata = await this.conn.getParsedTokenAccountsByOwner(pub, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
      })
      const info = ata.value[0]?.account.data as ParsedAccountData
      return info.parsed.info.tokenAmount.uiAmount || 0
    }
  }

  /** Samples balance over time (intervalMs) for count samples */
  async track(
    wallet: string,
    mint: string,
    count: number,
    intervalMs: number
  ): Promise<BalancePoint[]> {
    const result: BalancePoint[] = []
    for (let i = 0; i < count; i++) {
      const bal = await this.fetchBalance(wallet, mint)
      result.push({ timestamp: Date.now(), balance: bal })
      await new Promise(r => setTimeout(r, intervalMs))
    }
    return result
  }
}
