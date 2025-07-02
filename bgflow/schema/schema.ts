import { PublicKey } from "@solana/web3.js"

/** Validates a Solana public key string */
export const AddressSchema = z.string().refine(value => {
  try {
    new PublicKey(value)
    return true
  } catch {
    return false
  }
}, { message: "Invalid Solana public key" })

/** Generic mint address schema (same as AddressSchema) */
export const MintSchema = AddressSchema

/** Window length in hours (positive integer) */
export const WindowHoursSchema = z.number().int().positive()

/** Threshold for anomaly detection (positive number) */
export const ThresholdSchema = z.number().positive()

/** Schema for fetching a single balance */
export const GetBalanceInputSchema = z.object({
  mint: MintSchema
})

/** Schema for analyzing a token */
export const AnalyzeTokenInputSchema = z.object({
  mint: MintSchema,
  windowHours: WindowHoursSchema
})

/** Schema for detecting patterns */
export const DetectPatternsInputSchema = z.object({
  mint: MintSchema,
  threshold: ThresholdSchema
})

/** Schema for subscription or streaming requests */
export const StreamInputSchema = z.object({
  address: AddressSchema,
  limit: z.number().int().positive().optional()
})

/** Export types inferred from schemas */
export type GetBalanceInput = z.infer<typeof GetBalanceInputSchema>
export type AnalyzeTokenInput = z.infer<typeof AnalyzeTokenInputSchema>
export type DetectPatternsInput = z.infer<typeof DetectPatternsInputSchema>
export type StreamInput = z.infer<typeof StreamInputSchema>
