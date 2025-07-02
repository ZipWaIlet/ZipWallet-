import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"

/**
 * BalanceChecker retrieves SOL and SPL token balances for a wallet.
 */
export class BalanceChecker {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  /** Fetch SOL balance in tokens */
  async getSolBalance(address: string): Promise<number> {
    const pub = new PublicKey(address)
    const lamports = await this.conn.getBalance(pub)
    return lamports / LAMPORTS_PER_SOL
  }

  /** Fetch SPL token balance for a specific mint */
  async getSplBalance(address: string, mint: string): Promise<number> {
    const pub = new PublicKey(address)
    const mintKey = new PublicKey(mint)
    // derive associated token account
    const ata = await PublicKey.findProgramAddress(
      [pub.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintKey.toBuffer()],
      TOKEN_PROGRAM_ID
    )
    const info = await this.conn.getParsedAccountInfo(ata[0])
    const parsed = info.value?.data && "parsed" in info.value.data
      ? (info.value.data.parsed.info.tokenAmount.uiAmount as number)
      : 0
    return parsed
  }

  /** Fetch SOL + all SPL token balances for a wallet */
  async getAllBalances(address: string): Promise<Record<string, number>> {
    const pub = new PublicKey(address)
    const balances: Record<string, number> = {}
    // SOL
    balances.SOL = await this.getSolBalance(address)
    // SPL
    const accounts = await this.conn.getParsedTokenAccountsByOwner(pub, { programId: TOKEN_PROGRAM_ID })
    for (const acc of accounts.value) {
      const info = (acc.account.data as any).parsed.info
      balances[info.mint] = info.tokenAmount.uiAmount
    }
    return balances
  }
}
