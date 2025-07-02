import fs from "fs"
import path from "path"
import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"

/**
 * DataKit collects on-chain token metrics and persists them to disk.
 */
export interface TokenRecord {
  mint: string
  timestamp: number
  totalSupply: number
  holderCount: number
}

export class DataKit {
  private conn: Connection
  private outDir: string

  constructor(rpcUrl: string, outDir: string = "./data") {
    this.conn = new Connection(rpcUrl, "confirmed")
    this.outDir = outDir
    fs.mkdirSync(this.outDir, { recursive: true })
  }

  /**  
   * Fetches current supply and holder count for an SPL token mint.
   */
  async fetchTokenMetrics(mintAddress: string): Promise<Omit<TokenRecord, "timestamp">> {
    const mintPub = new PublicKey(mintAddress)
    const accounts = await this.conn.getParsedTokenAccountsByOwner(mintPub, {
      programId: TOKEN_PROGRAM_ID
    })
    const balances = accounts.value.map(acc => {
      const info = (acc.account.data as ParsedAccountData).parsed.info.tokenAmount
      return Number(info.uiAmount)
    })
    const totalSupply = balances.reduce((sum, b) => sum + b, 0)
    const holderCount = balances.filter(b => b > 0).length
    return { mint: mintAddress, totalSupply, holderCount }
  }

  /**
   * Records the metrics to a timestamped JSON file.
   */
  async record(mintAddress: string): Promise<TokenRecord> {
    const { totalSupply, holderCount, mint } = await this.fetchTokenMetrics(mintAddress)
    const record: TokenRecord = { mint, totalSupply, holderCount, timestamp: Date.now() }
    const file = path.join(this.outDir, `${mint}-${record.timestamp}.json`)
    fs.writeFileSync(file, JSON.stringify(record, null, 2))
    return record
  }
}