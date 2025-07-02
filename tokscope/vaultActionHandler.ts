
import { z } from "zod"
import { VaultCoreEngine } from "./vaultCoreEngine"
import type { ExecutionContext } from "./types"

const getWalletSchema = z.object({})
const balanceSchema   = z.object({ mintAddress: z.string() })
const allSchema       = z.object({})
const transferSchema  = z.object({
  recipient:    z.string(),
  amount:       z.number().positive(),
  mintAddress:  z.string()
})

export class VaultActionHandler {
  private engine: VaultCoreEngine

  constructor(engine: VaultCoreEngine) {
    this.engine = engine
  }

  async handle(actionId: string, payload: unknown, ctx: ExecutionContext) {
    switch (actionId) {
      case "getWallet":
        getWalletSchema.parse(payload)
        return { notice: "Wallet retrieved", data: { walletAddress: await this.engine.getWalletAddress(ctx.walletPubkey) } }

      case "getBalance":
        const { mintAddress } = balanceSchema.parse(payload)
        const bal = await this.engine.getBalance(ctx.walletPubkey, mintAddress)
        return { notice: "Balance fetched", data: { balance: bal } }

      case "getAllBalances":
        allSchema.parse(payload)
        const all = await this.engine.getAllBalances(ctx.walletPubkey)
        return { notice: "All balances fetched", data: { balances: all } }

      case "transfer":
        const { recipient, amount, mintAddress: m } = transferSchema.parse(payload)
        const sig = await this.engine.transfer(ctx.walletPubkey, new PublicKey(recipient), m, amount)
        return { notice: "Transfer executed", data: { txSignature: sig } }

      default:
        throw new Error(`Unknown action: ${actionId}`)
    }
  }
}
