import type { AgentRunRecord } from "./types";

export function compareAgentRuns(a: AgentRunRecord | undefined, b: AgentRunRecord | undefined): {
  runA: number | null;
  runB: number | null;
  sameOutcome: boolean | null;
  deltaBeforeBalance: number | null;
  deltaAmount: number | null;
  zDelta: number | null;
  summary: string;
} {
  if (!a || !b) {
    return {
      runA: a?.runId ?? null,
      runB: b?.runId ?? null,
      sameOutcome: null,
      deltaBeforeBalance: null,
      deltaAmount: null,
      zDelta: null,
      summary: "Both runIds must exist in persisted history."
    };
  }
  const za = a.stats?.zScore ?? null;
  const zb = b.stats?.zScore ?? null;
  const zDelta = za != null && zb != null ? Math.round((zb - za) * 1000) / 1000 : null;
  return {
    runA: a.runId,
    runB: b.runId,
    sameOutcome: a.outcome === b.outcome,
    deltaBeforeBalance: Math.round((b.beforeBalance - a.beforeBalance) * 100) / 100,
    deltaAmount: Math.round((b.decision.amount - a.decision.amount) * 100) / 100,
    zDelta,
    summary: `Run #${b.runId} vs #${a.runId}: outcome ${a.outcome ?? "?"} → ${b.outcome ?? "?"}, balance shift ${(b.beforeBalance - a.beforeBalance).toFixed(2)} USDT.`
  };
}
