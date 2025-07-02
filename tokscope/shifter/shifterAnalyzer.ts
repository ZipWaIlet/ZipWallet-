import { TransferRecord } from "./shifterFetch"

export interface ShifterSummary {
  totalVolume: number
  uniqueSenders: number
  uniqueReceivers: number
  transferCount: number
}

export class ShifterAnalyzer {
  summarize(records: TransferRecord[]): ShifterSummary {
    const totalVolume = records.reduce((sum, r) => sum + r.amount, 0)
    const senders = new Set(records.map(r => r.from)).size
    const receivers = new Set(records.map(r => r.to)).size
    return {
      totalVolume,
      uniqueSenders: senders,
      uniqueReceivers: receivers,
      transferCount: records.length
    }
  }
}