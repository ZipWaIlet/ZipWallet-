import { Connection, PublicKey } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token"

export class MoveWalletValidator {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  async validateAddress(address: string): Promise<PublicKey> {
    try {
      return new PublicKey(address)
    } catch {
      throw new Error("Invalid PublicKey")
    }
  }

  async hasSufficientSol(pubkey: PublicKey, amountSol: number): Promise<boolean> {
    const balance = await this.conn.getBalance(pubkey)
    return balance >= amountSol * 1e9
  }

  async hasSufficientSpl(pubkey: PublicKey, mint: PublicKey, amount: number): Promise<boolean> {
    const ata = getAssociatedTokenAddressSync(mint, pubkey)
    const info = await this.conn.getTokenAccountBalance(ata)
    return Number(info.value.amount) >= amount
  }
}