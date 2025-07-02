
import { Connection, ParsedConfirmedTransaction, ConfirmedSignatureInfo, PublicKey } from "@solana/web3.js"

export class ScanBlockService {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  async fetchTransactions(address: string, limit = 50): Promise<ParsedConfirmedTransaction[]> {
    const key = new PublicKey(address)
    const sigs: ConfirmedSignatureInfo[] = await this.conn.getSignaturesForAddress(key, { limit })
    const txs = await Promise.all(
      sigs.map(s => this.conn.getParsedConfirmedTransaction(s.signature))
    )
    return txs.filter((tx): tx is ParsedConfirmedTransaction => !!tx)
  }
}
