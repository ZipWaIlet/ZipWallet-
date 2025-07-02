import { z } from "zod"

export const TxRecordSchema = z.object({
  timestamp: z.number().int().nonnegative(),
  amount: z.number().nonnegative(),
  direction: z.enum(["in", "out"])
})

export const BehaviorProfileSchema = z.object({
  firstSeen: z.number().int().nonnegative(),
  lastSeen: z.number().int().nonnegative(),
  totalIn: z.number().nonnegative(),
  totalOut: z.number().nonnegative(),
  avgTxSize: z.number().nonnegative()
})

export const SpreadMetricsSchema = z.object({
  midPrice: z.number().nonnegative(),
  spreadPct: z.number().min(0)
})

export const InspectionResultSchema = z.object({
  behavior: BehaviorProfileSchema,
  spread: SpreadMetricsSchema
})