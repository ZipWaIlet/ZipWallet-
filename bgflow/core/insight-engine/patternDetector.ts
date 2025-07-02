import { predictBurst, BurstPrediction } from "./analyticsHelpers"

export class PatternDetector {
  /**
   * Given a series of [timestamp, volume], detect a recent burst window.
   */
  detect(series: Array<[number, number]>): BurstPrediction | null {
    return predictBurst(series)
  }
}