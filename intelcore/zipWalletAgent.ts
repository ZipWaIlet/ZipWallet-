import { BaseAction } from "./baseAction"
import { Connection, PublicKey, TokenAmount, ParsedAccountData } from "@solana/web3.js"
import * as tf from "@tensorflow/tfjs-node"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"

export interface AgentInput {
  walletAddress: string
  featureWindow?: number
  debug?: boolean
}

export interface AgentOutput {
  solBalance: number
  tokenCount: number
  alertLevel: "normal" | "warning" | "critical"
  modelScore: number
}

export class ZipWalletAgent extends BaseAction<AgentInput, AgentOutput> {
  private readonly conn: Connection
  private readonly modelPromise: Promise<tf.LayersModel>

  constructor(modelPath: string) {
    super("ZipWalletAgent")

    const endpoint = process.env.SOLANA_RPC_ENDPOINT
    if (!endpoint) {
      throw new Error("Missing SOLANA_RPC_ENDPOINT in environment")
    }

    this.conn = new Connection(endpoint, "confirmed")
    this.modelPromise = tf.loadLayersModel(`file://${modelPath}/model.json`)
  }

  protected async execute(input: AgentInput): Promise<AgentOutput> {
    const { walletAddress, featureWindow = 10, debug = false } = input

    // Validate address
    let pub: PublicKey
    try {
      pub = new PublicKey(walletAddress)
    } catch {
      throw new Error(`Invalid wallet address: ${walletAddress}`)
    }

    // Get SOL balance in SOL
    const lamports = await this.conn.getBalance(pub)
    const solBalance = lamports / 1e9

    // Get SPL token accounts
    const tokens = await this.conn.getParsedTokenAccountsByOwner(pub, {
      programId: TOKEN_PROGRAM_ID,
    })

    const tokenCount = tokens.value.length

    // Prepare features: normalize if needed
    const features = [solBalance, tokenCount, featureWindow]

    const model = await this.modelPromise
    const inputTensor = tf.tensor2d([features])
    const prediction = model.predict(inputTensor) as tf.Tensor

    const result = await prediction.array()
    const score: number = Array.isArray(result) ? result[0][0] : 0

    // Determine alert level
    const alertLevel: AgentOutput["alertLevel"] =
      score > 0.8 ? "critical" :
      score > 0.5 ? "warning" : "normal"

    if (debug) {
      console.log(`[ZipWalletAgent] Input: ${JSON.stringify(features)}`)
      console.log(`[ZipWalletAgent] Score: ${score}`)
      console.log(`[ZipWalletAgent] Level: ${alertLevel}`)
    }

    return {
      solBalance,
      tokenCount,
      modelScore: Number(score.toFixed(4)),
      alertLevel
    }
  }
}
