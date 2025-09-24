import {
  Connection,
  PublicKey,
  ConfirmedSignatureInfo,
  ParsedTransactionWithMeta,
  ParsedInstruction,
} from "@solana/web3.js"

export interface TransferRecord {
  signature: string
  from: string
  to: string
  amount: number
  timestamp: number
}

export class ShifterFetch {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  async records(mint: string, limit = 100): Promise<TransferRecord[]> {
    const key = new PublicKey(mint)
    const sigs: ConfirmedSignatureInfo[] = await this.conn.getSignaturesForAddress(key, { limit })
    const out: TransferRecord[] = []

    // Fetch transactions in parallel (with a cap to avoid RPC overload)
    const chunkSize = 10
    for (let i = 0; i < sigs.length; i += chunkSize) {
      const chunk = sigs.slice(i, i + chunkSize)
      const txs: (ParsedTransactionWithMeta | null)[] = await Promise.all(
        chunk.map((s) => this.conn.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 }))
      )

      txs.forEach((tx, idx) => {
        const sig = chunk[idx].signature
        const blockTime = chunk[idx].blockTime
        if (!tx || !blockTime) return

        const instructions = tx.transaction.message.instructions as ParsedInstruction[]
        for (const instr of instructions) {
          if (
            instr.program === "spl-token" &&
            instr.parsed?.type === "transfer" &&
            instr.parsed.info
          ) {
            const info: any = instr.parsed.info
            out.push({
              signature: sig,
              from: info.source,
              to: info.destination,
              amount: Number(info.amount),
              timestamp: blockTime * 1000,
            })
          }
        }
      })
    }

    return out
  }
}
