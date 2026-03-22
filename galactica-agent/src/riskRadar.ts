import type { TreasuryHealth } from "./health";
import type { BalanceStatsSnapshot } from "./types";

/** Five 0–100 axes for radar / spider charts in demos. */
export function buildRiskRadar(input: {
  health: TreasuryHealth;
  stats: BalanceStatsSnapshot;
  circuitOpen: boolean;
  maintenanceFrozen: boolean;
  openApprovals: number;
  dailyCap: number;
  budgetRemaining: number | null;
}): {
  axes: Record<string, number>;
  labels: Record<string, string>;
} {
  const liquidity = Math.min(100, Math.max(0, input.health.healthScore));

  let statistical = 88;
  if (input.stats.zScore != null) {
    statistical = Math.max(0, Math.round(100 - Math.abs(input.stats.zScore) * 14));
  }

  let operational = 92;
  if (input.circuitOpen) operational -= 50;
  if (input.maintenanceFrozen) operational -= 12;
  if (input.openApprovals > 2) operational -= Math.min(20, input.openApprovals * 4);

  const governance = Math.min(
    100,
    Math.max(35, 100 - input.openApprovals * 12)
  );

  let safety = 95;
  if (input.circuitOpen) safety -= 40;
  if (input.dailyCap > 0 && input.budgetRemaining != null) {
    const ratio = input.budgetRemaining / input.dailyCap;
    if (ratio < 0.08) safety -= 35;
    else if (ratio < 0.2) safety -= 18;
  }

  return {
    axes: {
      liquidity,
      statistical,
      operational,
      governance,
      safety: Math.max(0, Math.min(100, safety))
    },
    labels: {
      liquidity: "Liquidity vs policy bands",
      statistical: "Statistical calm (inverse |z|)",
      operational: "Ops throughput & gates",
      governance: "Human queue pressure",
      safety: "Hard limits & circuit posture"
    }
  };
}
