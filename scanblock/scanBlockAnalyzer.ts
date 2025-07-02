import { ParsedConfirmedTransaction } from "@solana/web3.js"

export interface BlockMetrics {
  txCount: number
  uniqueSigners: number
  largestInstructionCount: number
}

export class ScanBlockAnalyzer {
  analyze(transactions: ParsedConfirmedTransaction[]): BlockMetrics {
    const txCount = transactions.length
    const signers = new Set<string>()
    let maxInstr = 0

    for (const tx of transactions) {
      tx.transaction.signatures.forEach(sig => signers.add(sig))
      const instrCount = tx.transaction.message.instructions.length
      if (instrCount > maxInstr) maxInstr = instrCount
    }

    return {
      txCount,
      uniqueSigners: signers.size,
      largestInstructionCount: maxInstr
    }
  }
}