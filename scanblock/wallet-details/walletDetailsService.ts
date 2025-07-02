import { Connection, PublicKey, ParsedAccountData, ConfirmedSignatureInfo } from "@solana/web3.js"

export interface WalletDetails {
  address: string
  solBalance: number
  tokenBalances: Record<string, number>
  recentTxCount: number
}

export class WalletDetailsService {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  async getSolBalance(address: string): Promise<number> {
    const key = new PublicKey(address)
    const lamports = await this.conn.getBalance(key)
    return lamports / LAMPORTS_PER_SOL
  }

  async getTokenBalances(address: string): Promise<Record<string, number>> {
    const key = new PublicKey(address)
    const accounts = await this.conn.getParsedTokenAccountsByOwner(key, {
      programId: TOKEN_PROGRAM_ID
    })
    const balances: Record<string, number> = {}
    for (const acc of accounts.value) {
      const info = (acc.account.data as ParsedAccountData).parsed.info
      balances[info.mint] = Number(info.tokenAmount.uiAmount)
    }
    return balances
  }

  async getRecentTxCount(address: string, limit = 50): Promise<number> {
    const key = new PublicKey(address)
    const sigs: ConfirmedSignatureInfo[] = await this.conn.getSignaturesForAddress(key, { limit })
    return sigs.length
  }

  async fetchDetails(address: string): Promise<WalletDetails> {
    const solBalance = await this.getSolBalance(address)
    const tokenBalances = await this.getTokenBalances(address)
    const recentTxCount = await this.getRecentTxCount(address)
    return { address, solBalance, tokenBalances, recentTxCount }
  }
}