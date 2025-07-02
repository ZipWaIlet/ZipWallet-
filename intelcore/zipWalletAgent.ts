import { BaseAction } from "./baseAction"
import { Connection, PublicKey } from "@solana/web3.js"
import * as tf from "@tensorflow/tfjs-node"

export interface AgentInput {
  walletAddress: string
  featureWindow?: number
}

export interface AgentOutput {
  solBalance: number
  tokenCount: number
  alertLevel: "normal" | "warning" | "critical"
}

export class ZipWalletAgent extends BaseAction<AgentInput, AgentOutput> {
  private conn = new Connection(process.env.SOLANA_RPC_ENDPOINT!, "confirmed")
  private modelPromise: Promise<tf.LayersModel>

  constructor(modelPath: string) {
    super("ZipWalletAgent")
    this.modelPromise = tf.loadLayersModel(`file://${modelPath}/model.json`)
  }

  protected async execute(input: AgentInput): Promise<AgentOutput> {
    const { walletAddress, featureWindow = 10 } = input
    const pub = new PublicKey(walletAddress)

    // Fetch SOL balance
    const lamports = await this.conn.getBalance(pub)
    const solBalance = lamports / 1e9

    // Count SPL token accounts
    const resp = await this.conn.getParsedTokenAccountsByOwner(pub, {
      programId: TOKEN_PROGRAM_ID
    })
    const tokenCount = resp.value.length

    // Prepare feature vector: [solBalance, tokenCount, featureWindow]
    const model = await this.modelPromise
    const inputTensor = tf.tensor2d([[solBalance, tokenCount, featureWindow]])
    const [score] = (model.predict(inputTensor) as tf.Tensor).arraySync() as number[]

    // Determine alert level
    const alertLevel = score > 0.8 ? "critical" : score > 0.5 ? "warning" : "normal"

    return { solBalance, tokenCount, alertLevel }
  }
}