import { Connection, PublicKey, ConfirmedSignatureInfo } from "@solana/web3.js"

export interface StreamEvent {
  signature: string
  address: string
  timestamp: number
}

export class StreamScanService {
  private conn: Connection

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed")
  }

  /** 
   * Stream recent transaction signatures for a mint or wallet
   */
  async stream(address: string, limit = 100): Promise<StreamEvent[]> {
    const key = new PublicKey(address)
    const sigs: ConfirmedSignatureInfo[] = await this.conn.getSignaturesForAddress(key, { limit })
    return sigs
      .filter(s => s.blockTime != null)
      .map(s => ({
        signature: s.signature,
        address,
        timestamp: s.blockTime! * 1000
      }))
  }
}