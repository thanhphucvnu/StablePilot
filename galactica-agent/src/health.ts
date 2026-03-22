import { estimateRunwayHours } from "./forecast";
import { getEffectivePolicy, getRuntimePreset } from "./runtimePreset";
import type { PolicyPresetName } from "./types";
import { AgentRunRecord } from "./types";

export type TreasuryStatus = "healthy" | "warning" | "critical";

export interface TreasuryHealth {
  healthScore: number;
  status: TreasuryStatus;
  usdtBalance: number;
  distanceToMin: number;
  distanceToTarget: number;
  preset: PolicyPresetName;
  effectiveMin: number;
  effectiveTarget: number;
  runsLast24h: number;
  cooldownRemainingMs: number;
  lastTransferAt: string | null;
  /** Hours until effective min at observed drain rate; null if unknown */
  runwayHours: number | null;
}

const MS_DAY = 86_400_000;

function countRunsLast24h(history: AgentRunRecord[]): number {
  const cutoff = Date.now() - MS_DAY;
  return history.filter((r) => new Date(r.at).getTime() >= cutoff).length;
}

export function buildTreasuryHealth(
  usdtBalance: number,
  history: AgentRunRecord[],
  cooldownRemainingMs: number,
  lastTransferAt: number | null
): TreasuryHealth {
  const policy = getEffectivePolicy();
  const preset = getRuntimePreset();
  const distanceToMin = usdtBalance - policy.minUsdtBalance;
  const distanceToTarget = usdtBalance - policy.targetUsdtBalance;

  let healthScore: number;
  if (policy.targetUsdtBalance <= policy.minUsdtBalance) {
    healthScore = distanceToMin >= 0 ? 80 : 20;
  } else {
    const span = policy.targetUsdtBalance - policy.minUsdtBalance;
    const t = (usdtBalance - policy.minUsdtBalance) / span;
    healthScore = Math.round(Math.min(100, Math.max(0, t * 100)));
  }

  let status: TreasuryStatus = "healthy";
  if (healthScore < 35 || usdtBalance < policy.minUsdtBalance * 0.85) {
    status = "critical";
  } else if (healthScore < 65 || usdtBalance < policy.minUsdtBalance) {
    status = "warning";
  }

  return {
    healthScore,
    status,
    usdtBalance,
    distanceToMin,
    distanceToTarget,
    preset,
    effectiveMin: policy.minUsdtBalance,
    effectiveTarget: policy.targetUsdtBalance,
    runsLast24h: countRunsLast24h(history),
    cooldownRemainingMs,
    lastTransferAt: lastTransferAt ? new Date(lastTransferAt).toISOString() : null,
    runwayHours: estimateRunwayHours(usdtBalance, policy.minUsdtBalance, history)
  };
}
