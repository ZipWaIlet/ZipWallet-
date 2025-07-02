import express from "express"
import { MoveWalletEngine } from "./MoveWalletEngine"
import { MoveWalletValidator } from "./MoveWalletValidator"
import { PublicKey } from "@solana/web3.js"

const app = express()
app.use(express.json())

const rpc = process.env.SOLANA_RPC_ENDPOINT!
const engine = new MoveWalletEngine(rpc)
const validator = new MoveWalletValidator(rpc)

app.post("/movewallet/sol", async (req, res) => {
  const { from, to, amount } = req.body
  try {
    const src = await validator.validateAddress(from)
    const dst = await validator.validateAddress(to)
    if (!(await validator.hasSufficientSol(src, amount))) {
      return res.status(400).json({ success: false, error: "Insufficient SOL balance" })
    }
    const sig = await engine.transferSol(src, dst, amount)
    res.json({ success: true, signature: sig })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

app.post("/movewallet/spl", async (req, res) => {
  const { from, to, mint, amount } = req.body
  try {
    const src = await validator.validateAddress(from)
    const dst = await validator.validateAddress(to)
    const mintKey = new PublicKey(mint)
    if (!(await validator.hasSufficientSpl(src, mintKey, amount))) {
      return res.status(400).json({ success: false, error: "Insufficient SPL balance" })
    }
    const sig = await engine.transferSpl(src, dst, mintKey, amount)
    res.json({ success: true, signature: sig })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`MoveWallet API on port ${port}`))