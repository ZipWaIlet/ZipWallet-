// analytics.ts — deterministic utilities with stronger typing, validation, and configurability

// ----------------------------- Risk score -----------------------------

export interface RiskScore {
  score: number            // 0–100 (clamped)
  level: "low" | "medium" | "high"
  normalized: number       // 0–1
}

export interface RiskScoreOptions {
  /** Multiply the factor before converting to 0–100 */
  scale?: number           // default 10
  /** Band thresholds expressed on 0–100 scale */
  bands?: { medium: number; high: number } // default { medium: 40, high: 70 }
}

/**
 * Compute a risk score from an arbitrary numeric factor.
 * Deterministic, with configurable scaling and band thresholds.
 */
export function computeRiskScore(factor: number, opts: RiskScoreOptions = {}): RiskScore {
  assertFinite(factor, "factor")
  const scale = isFiniteNumber(opts.scale) ? opts.scale! : 10
  const bands = opts.bands ?? { medium: 40, high: 70 }

  const raw = clamp(0, 100, Math.round(factor * scale))
  const normalized = round(raw / 100, 3)
  const level: RiskScore["level"] =
    raw >= bands.high ? "high" : raw >= bands.medium ? "medium" : "low"

  return { score: raw, level, normalized }
}

// ----------------------------- Heatmap -----------------------------

export type HeatmapPoint = { day: number; hour: number; count: number }

export interface HeatmapOptions {
  /**
   * Minutes to shift timestamps before bucketing (e.g., timezone offset)
   * Positive values move the time forward. Default = 0 (UTC-based bucketing)
   */
  tzOffsetMinutes?: number
  /**
   * Week start day (0 = Sunday .. 6 = Saturday). Default = 0 (Sunday)
   * This only affects semantics of "day" field; no reordering is performed
   */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
}

/**
 * Build a 7×24 heatmap from epoch millisecond timestamps.
 * Deterministic and memory-efficient.
 */
export function buildActivityHeatmap(timestamps: number[], opts: HeatmapOptions = {}): HeatmapPoint[] {
  if (!Array.isArray(timestamps)) throw new Error("timestamps must be an array")
  const tzShift = isFiniteNumber(opts.tzOffsetMinutes) ? (opts.tzOffsetMinutes as number) : 0
  const buckets: Record<string, number> = Object.create(null)

  for (const ts of timestamps) {
    assertFinite(ts, "timestamp")
    // Apply timezone shift in minutes
    const shifted = ts + tzShift * 60_000
    const d = new Date(shifted)
    const key = `${d.getUTCDay()}-${d.getUTCHours()}`
    buckets[key] = (buckets[key] || 0) + 1
  }

  const result: HeatmapPoint[] = []
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${day}-${hour}`
      result.push({ day, hour, count: buckets[key] || 0 })
    }
  }
  return result
}

// ----------------------------- Burst detection -----------------------------

export interface BurstPrediction {
  start: number   // epoch ms
  end: number     // epoch ms
  confidence: number // 0–1
}

export interface PredictBurstOptions {
  /**
   * Multiplier on baseline to qualify as a burst point (default 2)
   * Baseline is robust: median + k * MAD
   */
  multiplier?: number
  /**
   * Cap used to normalize confidence: peak / (baseline * cap) (default 3)
   */
  cap?: number
  /**
   * Robustness factor for baseline: value = median + k * MAD (default 1)
   */
  madK?: number
}

/**
 * Detect the most recent contiguous burst segment in a series.
 * Uses a robust baseline (median + madK * MAD). Assumes series items are [timestamp, value].
 */
export function predictBurst(
  series: Array<[number, number]>,
  options: PredictBurstOptions = {}
): BurstPrediction | null {
  if (!Array.isArray(series) || series.length < 2) return null

  // Validate and sort by timestamp deterministically
  const data = series.map(([t, v]) => {
    assertFinite(t, "timestamp")
    assertFinite(v, "value")
    return [t, v] as [number, number]
  }).sort((a, b) => a[0] - b[0])

  const values = data.map(([, v]) => v)
  const med = median(values)
  const mad = median(values.map((v) => Math.abs(v - med)))
  const madK = isFiniteNumber(options.madK) ? (options.madK as number) : 1
  const baseline = med + madK * mad

  const multiplier = isFiniteNumber(options.multiplier) ? (options.multiplier as number) : 2
  const threshold = baseline * multiplier

  // Identify all indices above threshold and gather the last contiguous run
  let lastStart = -1
  let lastEnd = -1
  for (let i = 0; i < data.length; i++) {
    const above = data[i][1] > threshold
    if (above) {
      if (lastStart === -1) lastStart = i
      lastEnd = i
    } else {
      // reset if we were in a run
      if (lastStart !== -1) {
        // continue scanning to get the *latest* run
        lastStart = -1
        lastEnd = -1
      }
    }
  }

  if (lastEnd === -1) return null

  // If the last points are above threshold, find the earliest index in that final run
  let i = lastEnd
  while (i > 0 && data[i - 1][1] > threshold) i--
  const startIdx = i
  const endIdx = lastEnd

  const start = data[startIdx][0]
  const end = data[endIdx][0]
  const peak = Math.max(...data.slice(startIdx, endIdx + 1).map(([, v]) => v))

  const cap = isFiniteNumber(options.cap) ? (options.cap as number) : 3
  const confidence = clamp(0, 1, baseline > 0 ? peak / (baseline * cap) : 1)

  return { start, end, confidence: round(confidence, 3) }
}

// ----------------------------- Entropy -----------------------------

export interface EntropyResult {
  entropy: number            // Shannon entropy in bits
  normalized: number         // 0..1 relative to log2(k) where k = non-zero bins
  perplexity: number         // 2^entropy
  gini: number               // 0..1 inequality (0 uniform, 1 concentrated)
  message?: string
}

/**
 * Estimate Shannon entropy of an array of non-negative counts.
 * Returns additional diagnostics: normalized entropy, perplexity, and Gini.
 */
export function analyzeTransactionEntropy(counts: number[]): EntropyResult {
  if (!Array.isArray(counts) || counts.length === 0) {
    return { entropy: 0, normalized: 0, perplexity: 1, gini: 0, message: "no data" }
  }
  for (const c of counts) assertNonNegative(c, "counts[]")

  const total = counts.reduce((s, v) => s + v, 0)
  if (total === 0) {
    return { entropy: 0, normalized: 0, perplexity: 1, gini: 0, message: "all zero" }
  }

  const probs = counts.map((v) => v / total)
  const nz = probs.filter((p) => p > 0)
  const k = nz.length
  const entropy = -nz.reduce((s, p) => s + p * log2(p), 0)
  const maxEntropy = log2(k)
  const normalized = maxEntropy > 0 ? entropy / maxEntropy : 0
  const perplexity = Math.pow(2, entropy)
  const gini = giniCoefficient(probs)

  return {
    entropy: round(entropy, 6),
    normalized: round(normalized, 6),
    perplexity: round(perplexity, 6),
    gini: round(gini, 6),
  }
}

// ----------------------------- helpers -----------------------------

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x)
}

function assertFinite(x: unknown, name: string): void {
  if (!isFiniteNumber(x)) throw new Error(`${name} must be a finite number`)
}

function assertNonNegative(x: unknown, name: string): void {
  if (!isFiniteNumber(x) || x < 0) throw new Error(`${name} must be a non-negative number`)
}

function clamp(min: number, max: number, x: number): number {
  return Math.max(min, Math.min(max, x))
}

function round(x: number, digits: number): number {
  const p = Math.pow(10, digits)
  return Math.round(x * p) / p
}

function log2(x: number): number {
  return Math.log(x) / Math.LN2
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

/** Gini coefficient for probability vector (sums to 1, non-neg) */
function giniCoefficient(probs: number[]): number {
  const s = [...probs].sort((a, b) => a - b)
  const n = s.length
  if (n === 0) return 0
  let cum = 0
  let weightedSum = 0
  for (let i = 0; i < n; i++) {
    cum += s[i]
    weightedSum += cum
  }
  // Lorenz-based formula: G = 1 - 2 * (sum of cumulative probs) / n
  const lorenzArea = weightedSum / n
  return clamp(0, 1, 1 - 2 * lorenzArea)
}
