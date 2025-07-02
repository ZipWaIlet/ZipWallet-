import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"

export interface Balances {
  SOL: number
  tokens: Record<string, number>
}

export class GrabBalanceService {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  async fetch(address: string): Promise<Balances> {
    const key = new PublicKey(address)
    const lamports = await this.conn.getBalance(key)
    const sol = lamports / LAMPORTS_PER_SOL

    const accounts = await this.conn.getParsedTokenAccountsByOwner(key, {
      programId: TOKEN_PROGRAM_ID
    })
    const tokens: Record<string, number> = {}
    for (const acc of accounts.value) {
      const info = (acc.account.data as ParsedAccountData).parsed.info
      tokens[info.mint] = Number(info.tokenAmount.uiAmount)
    }

    return { SOL: sol, tokens }
  }
}