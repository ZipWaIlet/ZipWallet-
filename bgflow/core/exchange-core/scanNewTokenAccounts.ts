
import { Connection, PublicKey, ConfirmedSignatureInfo, ParsedConfirmedTransaction } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"

export interface NewAccountEvent {
  account: string
  owner: string
  timestamp: number
  signature: string
}

export class ScanNewTokenAccounts {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  /**
   * Scan recent transactions for creation of new associated token accounts for a given mint.
   * @param mint - SPL token mint address
   * @param limit - number of recent signatures to scan
   */
  async fetchNewAccounts(mint: string, limit = 100): Promise<NewAccountEvent[]> {
    const mintKey = new PublicKey(mint)
    // we look up transactions interacting with the token program
    const sigs: ConfirmedSignatureInfo[] = await this.conn.getSignaturesForAddress(
      TOKEN_PROGRAM_ID, { limit }
    )
    const events: NewAccountEvent[] = []

    for (const { signature, blockTime } of sigs) {
      if (!blockTime) continue
      const tx = await this.conn.getParsedConfirmedTransaction(signature)
      if (!tx) continue
      for (const instr of tx.transaction.message.instructions as any[]) {
        if (
          instr.programId.equals(TOKEN_PROGRAM_ID) &&
          instr.parsed?.type === "createAccount" &&
          instr.parsed.info.mint === mintKey.toBase58()
        ) {
          events.push({
            account: instr.parsed.info.account,
            owner: instr.parsed.info.owner,
            timestamp: blockTime * 1000,
            signature
          })
        }
      }
    }

    return events.sort((a, b) => a.timestamp - b.timestamp)
  }
}
