import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createTransferInstruction } from "@solana/spl-token"

export class MoveWalletEngine {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  async transferSol(from: PublicKey, to: PublicKey, amountSol: number): Promise<string> {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from,
        toPubkey: to,
        lamports: amountSol * LAMPORTS_PER_SOL
      })
    )
    return this.conn.sendTransaction(tx, [])
  }

  async transferSpl(
    from: PublicKey,
    to: PublicKey,
    mint: PublicKey,
    amount: number
  ): Promise<string> {
    const fromAta = getAssociatedTokenAddressSync(mint, from)
    const toAta = getAssociatedTokenAddressSync(mint, to)
    const tx = new Transaction().add(
      createTransferInstruction(
        fromAta,
        toAta,
        from,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )
    )
    return this.conn.sendTransaction(tx, [])
  }
}