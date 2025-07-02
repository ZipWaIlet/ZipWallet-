import { z } from "zod"
import {
  ZIPWALLET_GET_WALLET,
  ZIPWALLET_GET_BALANCE,
  ZIPWALLET_GET_ALL_BALANCES,
  ZIPWALLET_ANALYZE_TOKEN,
  ZIPWALLET_DETECT_PATTERNS
} from "@/zipwallet/action-names"
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  ParsedAccountData
} from "@solana/web3.js"
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createTransferInstruction
} from "@solana/spl-token"
import { AnalysisEngine } from "./analysisEngine"

/* ========= Types ========= */

export interface ActionResponse<T> {
  notice: string
  data?: T
}

export interface ExecContext {
  connection: Connection
  walletPubkey: PublicKey
  sendTransaction: (tx: Transaction) => Promise<string>
}

export interface ActionCore<S extends z.ZodTypeAny, R> {
  id: string
  summary: string
  input: S
  execute: (opts: { payload: z.infer<S>; context: ExecContext }) => Promise<ActionResponse<R>>
}

/* 1. Get wallet */
export const getWalletAction: ActionCore<z.ZodObject<{}>, { wallet: string }> = {
  id: ZIPWALLET_GET_WALLET,
  summary: "Retrieve the active wallet address",
  input: z.object({}),
  execute: async ({ context }) => ({
    notice: "Wallet retrieved",
    data: { wallet: context.walletPubkey.toBase58() }
  })
}

/* 2. Get balance */
export const getBalanceAction: ActionCore<
  z.ZodObject<{ mint: z.ZodString }>,
  { balance: number }
> = {
  id: ZIPWALLET_GET_BALANCE,
  summary: "Fetch balance for a specific token",
  input: z.object({ mint: z.string() }),
  execute: async ({ payload, context }) => {
    if (payload.mint === "SOL") {
      const lamports = await context.connection.getBalance(context.walletPubkey)
      return { notice: "SOL balance", data: { balance: lamports / LAMPORTS_PER_SOL } }
    }
    const mintKey = new PublicKey(payload.mint)
    const ata = getAssociatedTokenAddressSync(mintKey, context.walletPubkey)
    const info = await context.connection.getParsedAccountInfo(ata)
    const ui = info.value?.data && "parsed" in info.value.data
      ? (info.value.data.parsed.info.tokenAmount.uiAmount as number)
      : 0
    return { notice: "Token balance", data: { balance: ui } }
  }
}

/* 3. Get all balances */
export const getAllBalancesAction: ActionCore<z.ZodObject<{}>, { balances: Record<string, number> }> = {
  id: ZIPWALLET_GET_ALL_BALANCES,
  summary: "Fetch all token balances",
  input: z.object({}),
  execute: async ({ context }) => {
    const balances: Record<string, number> = {}
    const lam = await context.connection.getBalance(context.walletPubkey)
    balances.SOL = lam / LAMPORTS_PER_SOL
    const toks = await context.connection.getParsedTokenAccountsByOwner(
      context.walletPubkey,
      { programId: TOKEN_PROGRAM_ID }
    )
    toks.value.forEach(acc => {
      const parsed = (acc.account.data as ParsedAccountData).parsed.info
      balances[parsed.mint] = parsed.tokenAmount.uiAmount
    })
    return { notice: "All balances", data: { balances } }
  }
}

/* 4. Analyze token */
export const analyzeTokenAction: ActionCore<
  z.ZodObject<{ mint: z.ZodString; windowHours: z.ZodNumber }>,
  { metrics: any }
> = {
  id: ZIPWALLET_ANALYZE_TOKEN,
  summary: "Perform deep analysis on a token",
  input: z.object({ mint: z.string(), windowHours: z.number().int().positive() }),
  execute: async ({ payload }) => {
    const engine = new AnalysisEngine(process.env.SOLANA_RPC_ENDPOINT!)
    const metrics = await engine.computeMetrics(payload.mint, payload.windowHours)
    return { notice: "Token analyzed", data: { metrics } }
  }
}

/* 5. Detect patterns */
export const detectPatternsAction: ActionCore<
  z.ZodObject<{ mint: z.ZodString; threshold: z.ZodNumber }>,
  { patterns: any }
> = {
  id: ZIPWALLET_DETECT_PATTERNS,
  summary: "Identify transfer anomalies and bursts",
  input: z.object({ mint: z.string(), threshold: z.number().positive() }),
  execute: async ({ payload }) => {
    const engine = new AnalysisEngine(process.env.SOLANA_RPC_ENDPOINT!)
    const patterns = await engine.findAnomalies(payload.mint, payload.threshold)
    return { notice: "Patterns detected", data: { patterns } }
  }
}
