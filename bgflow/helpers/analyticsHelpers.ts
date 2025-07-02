
export interface RiskScore {
  score: number
  level: "low" | "medium" | "high"
}

/**
 * Compute a simple risk score based on an arbitrary numeric factor.
 */
export function computeRiskScore(factor: number): RiskScore {
  const raw = Math.min(100, Math.round(factor * 10))
  const level: RiskScore["level"] =
    raw > 70 ? "high" : raw > 40 ? "medium" : "low"
  return { score: raw, level }
}

export type HeatmapPoint = { day: number; hour: number; count: number }

/**
 * Build a 7×24 heatmap from timestamps.
 */
export function buildActivityHeatmap(timestamps: number[]): HeatmapPoint[] {
  const buckets: Record<string, number> = {}
  for (const ts of timestamps) {
    const d = new Date(ts)
    const key = `${d.getDay()}-${d.getHours()}`
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

export interface BurstPrediction {
  start: number
  end: number
  confidence: number
}

/**
 * Detect the most recent burst in a time series.
 */
export function predictBurst(
  series: Array<[number, number]>,
  multiplier = 2,
  cap = 3
): BurstPrediction | null {
  if (series.length < 2) return null
  const avg = series.reduce((s, [, v]) => s + v, 0) / series.length
  let start: number | null = null
  let end = 0
  for (const [ts, vol] of series) {
    if (vol > avg * multiplier) {
      start = start ?? ts
      end = ts
    }
  }
  if (start === null) return null
  const peak = Math.max(...series.map(([, v]) => v))
  const confidence = Math.min(1, peak / (avg * cap))
  return { start, end, confidence }
}

export interface EntropyResult {
  entropy: number
  message?: string
}

/**
 * Estimate Shannon entropy of an array of numeric counts.
 */
export function analyzeTransactionEntropy(counts: number[]): EntropyResult {
  if (!counts.length) return { entropy: 0, message: "no data" }
  const total = counts.reduce((s, v) => s + v, 0)
  const probs = counts.map(v => v / total)
  const entropy = -probs.reduce((s, p) => (p > 0 ? s + p * Math.log2(p) : s), 0)
  return { entropy }
}
