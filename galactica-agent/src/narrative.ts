import type { BalanceStatsSnapshot, PolicyDecision, PipelineStep } from "./types";

export function buildTreasuryNarrative(
  decision: PolicyDecision,
  stats: BalanceStatsSnapshot,
  pipeline: PipelineStep[],
  autonomyLabel: string
): string {
  const z =
    stats.zScore === null ? "n/a (warm-up)" : stats.zScore.toFixed(2);
  const statLine = `[Risk Quants] Sample=${stats.sampleSize} μΔ=${stats.meanDelta.toFixed(2)} σΔ=${stats.stdDelta.toFixed(2)} z=${z} → ${stats.anomalous ? "OUTLIER vs history" : "within band"}.`;
  const policyLine = `[Treasury Sentinel] ${decision.reason} (risk=${decision.risk}).`;
  const pipeLine = `[Council] Layers: ${pipeline.map((p) => `${p.layer}:${p.passed ? "ok" : "hold"}`).join(" → ")}.`;
  const modeLine = `[Execution] Mode=${autonomyLabel}.`;
  return [policyLine, statLine, pipeLine, modeLine].join(" ");
}
