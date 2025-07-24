import { z } from "zod"
import { PublicKey } from "@solana/web3.js"
import { VaultCoreEngine } from "./vaultCoreEngine"
import type { ExecutionContext } from "./types"

// Action payload schemas
const getWalletSchema = z.object({})
const balanceSchema   = z.object({ mintAddress: z.string() })
const allSchema       = z.object({})
const transferSchema  = z.object({
  recipient:   z.string().refine(val => PublicKey.isOnCurve(new PublicKey(val)), {
    message: "Invalid recipient public key",
  }),
  amount:      z.number().positive(),
  mintAddress: z.string().min(1),
})

// Unified response envelope
type ActionResult<T> = {
  notice: string
  data?: T
  error?: string
}

export class VaultActionHandler {
  private engine: VaultCoreEngine

  constructor(engine: VaultCoreEngine) {
    this.engine = engine
  }

  /**
   * Handle an action by its ID with validated payload
   */
  public async handle(
    actionId: string,
    payload: unknown,
    ctx: ExecutionContext
  ): Promise<ActionResult<any>> {
    try {
      switch (actionId) {
        case "getWallet": {
          getWalletSchema.parse(payload)
          const address = await this.engine.getWalletAddress(ctx.walletPubkey)
          return { notice: "Wallet retrieved", data: { walletAddress: address } }
        }

        case "getBalance": {
          const { mintAddress } = balanceSchema.parse(payload)
          const balance = await this.engine.getBalance(ctx.walletPubkey, mintAddress)
          return { notice: "Balance fetched", data: { balance } }
        }

        case "getAllBalances": {
          allSchema.parse(payload)
          const balances = await this.engine.getAllBalances(ctx.walletPubkey)
          return { notice: "All balances fetched", data: { balances } }
        }

        case "transfer": {
          const { recipient, amount, mintAddress } = transferSchema.parse(payload)
          const recipientPubkey = new PublicKey(recipient)
          const txSignature = await this.engine.transfer(
            ctx.walletPubkey,
            recipientPubkey,
            mintAddress,
            amount
          )
          return { notice: "Transfer executed", data: { txSignature } }
        }

        default:
          return { notice: "Unknown action", error: `Unsupported action: ${actionId}` }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { notice: "Action failed", error: message }
    }
  }
}
