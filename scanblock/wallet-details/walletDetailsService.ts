import {
  Connection,
  PublicKey,
  ParsedAccountData,
  ConfirmedSignatureInfo,
  LAMPORTS_PER_SOL,
  TOKEN_PROGRAM_ID,
  Commitment,
} from "@solana/web3.js"

export interface WalletDetails {
  address: string
  solBalance: number
  tokenBalances: Record<string, number>
  recentTxCount: number
  fetchedAt: number
}

interface WalletDetailsServiceOptions {
  commitment?: Commitment
  cacheTtlMs?: number
  retryCount?: number
  retryDelayMs?: number
}

export class WalletDetailsService {
  private conn: Connection
  private cache = new Map<string, { details: WalletDetails; ts: number }>()
  private commitment: Commitment
  private cacheTtlMs: number
  private retryCount: number
  private retryDelayMs: number

  constructor(rpcUrl: string, options: WalletDetailsServiceOptions = {}) {
    this.conn = new Connection(rpcUrl, options.commitment ?? "confirmed")
    this.commitment = options.commitment ?? "confirmed"
    this.cacheTtlMs = options.cacheTtlMs ?? 30_000  // cache for 30s
    this.retryCount = options.retryCount ?? 3
    this.retryDelayMs = options.retryDelayMs ?? 500
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0
    let delay = this.retryDelayMs
    while (true) {
      try {
        return await fn()
      } catch (err) {
        attempt++
        if (attempt >= this.retryCount) throw err
        await new Promise((res) => setTimeout(res, delay))
        delay *= 2
      }
    }
  }

  async getSolBalance(address: string): Promise<number> {
    const key = new PublicKey(address)
    const lamports = await this.withRetry(() =>
      this.conn.getBalance(key, this.commitment)
    )
    return lamports / LAMPORTS_PER_SOL
  }

  async getTokenBalances(address: string): Promise<Record<string, number>> {
    const key = new PublicKey(address)
    const resp = await this.withRetry(() =>
      this.conn.getParsedTokenAccountsByOwner(key, {
        programId: TOKEN_PROGRAM_ID,
        commitment: this.commitment,
      })
    )
    const balances: Record<string, number> = {}
    for (const acc of resp.value) {
      const info = (acc.account.data as ParsedAccountData).parsed.info
      balances[info.mint] = Number(info.tokenAmount.uiAmount)
    }
    return balances
  }

  async getRecentTxCount(address: string, limit = 50): Promise<number> {
    const key = new PublicKey(address)
    const sigs: ConfirmedSignatureInfo[] = await this.withRetry(() =>
      this.conn.getSignaturesForAddress(key, { limit })
    )
    return sigs.length
  }

  /** Fetch all details, using cache if fresh */
  async fetchDetails(address: string): Promise<WalletDetails> {
    const now = Date.now()
    const cached = this.cache.get(address)
    if (cached && now - cached.ts < this.cacheTtlMs) {
      return cached.details
    }

    const [solBalance, tokenBalances, recentTxCount] = await Promise.all([
      this.getSolBalance(address),
      this.getTokenBalances(address),
      this.getRecentTxCount(address),
    ])

    const details: WalletDetails = {
      address,
      solBalance,
      tokenBalances,
      recentTxCount,
      fetchedAt: now,
    }
    this.cache.set(address, { details, ts: now })
    return details
  }

  /** Clear cache for a specific wallet or all */
  clearCache(address?: string): void {
    if (address) {
      this.cache.delete(address)
    } else {
      this.cache.clear()
    }
  }
}
