import { config } from "./config";
import type { AgentRunRecord, BalanceStatsSnapshot } from "./types";

export function computeBalanceFlowStats(
  snapshotBalance: number,
  history: AgentRunRecord[]
): BalanceStatsSnapshot {
  const recent = history.slice(-25);
  if (recent.length < 2) {
    return {
      sampleSize: recent.length,
      meanDelta: 0,
      stdDelta: 0,
      lastDelta: 0,
      zScore: null,
      anomalous: false
    };
  }

  const deltas: number[] = [];
  for (let i = 1; i < recent.length; i += 1) {
    deltas.push(recent[i].beforeBalance - recent[i - 1].beforeBalance);
  }

  const lastBefore = recent[recent.length - 1]!.beforeBalance;
  const lastDelta = snapshotBalance - lastBefore;
  deltas.push(lastDelta);

  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const variance =
    deltas.length > 1
      ? deltas.reduce((s, d) => s + (d - mean) ** 2, 0) / (deltas.length - 1)
      : 0;
  const stdDelta = Math.sqrt(variance) || 1e-6;
  const zScore = (lastDelta - mean) / stdDelta;
  const threshold = config.governanceZThreshold;

  return {
    sampleSize: deltas.length,
    meanDelta: mean,
    stdDelta,
    lastDelta,
    zScore,
    anomalous: Math.abs(zScore) > threshold
  };
}
