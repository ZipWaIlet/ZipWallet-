import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createTransferInstruction } from "@solana/spl-token"

export class VaultCoreEngine {
  constructor(private rpcUrl: string, private sendTx: (tx: Transaction) => Promise<string>) {}

  async getWalletAddress(walletPubkey: PublicKey): Promise<string> {
    return walletPubkey.toBase58()
  }

  async getBalance(walletPubkey: PublicKey, mintAddress: string): Promise<number> {
    if (mintAddress === "SOL") {
      const lamports = await new Connection(this.rpcUrl).getBalance(walletPubkey)
      return lamports / LAMPORTS_PER_SOL
    }
    const mint = new PublicKey(mintAddress)
    const ata = getAssociatedTokenAddressSync(mint, walletPubkey)
    const info = await new Connection(this.rpcUrl).getParsedAccountInfo(ata)
    const ui = info.value?.data && "parsed" in info.value.data
      ? (info.value.data.parsed.info.tokenAmount.uiAmount as number)
      : 0
    return ui
  }

  async getAllBalances(walletPubkey: PublicKey): Promise<Record<string, number>> {
    const conn = new Connection(this.rpcUrl)
    const result: Record<string, number> = {}
    const solLam = await conn.getBalance(walletPubkey)
    result.SOL = solLam / LAMPORTS_PER_SOL
    const tokens = await conn.getParsedTokenAccountsByOwner(walletPubkey, { programId: TOKEN_PROGRAM_ID })
    tokens.value.forEach(acc => {
      const parsed = (acc.account.data as any).parsed.info
      result[parsed.mint] = parsed.tokenAmount.uiAmount
    })
    return result
  }

  async transfer(
    walletPubkey: PublicKey,
    recipient: PublicKey,
    mintAddress: string,
    amount: number
  ): Promise<string> {
    const conn = new Connection(this.rpcUrl)
    const tx = new Transaction()
    if (mintAddress === "SOL") {
      tx.add(SystemProgram.transfer({
        fromPubkey: walletPubkey,
        toPubkey: recipient,
        lamports: amount * LAMPORTS_PER_SOL
      }))
    } else {
      const mint = new PublicKey(mintAddress)
      const fromAta = getAssociatedTokenAddressSync(mint, walletPubkey)
      const toAta   = getAssociatedTokenAddressSync(mint, recipient)
      tx.add(createTransferInstruction(
        fromAta, toAta, walletPubkey,
        amount, [], TOKEN_PROGRAM_ID
      ))
    }
    return this.sendTx(tx)
  }
}
