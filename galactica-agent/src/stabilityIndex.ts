import type { TreasuryHealth } from "./health";

export type StabilityTier = "excellent" | "stable" | "strained" | "critical";

/**
 * Treasury Stability Index (TSI) — single 0–100 score blending health, drift calm, and ops headroom.
 * Higher is safer / more stable for demo narratives.
 */
export function buildTreasuryStabilityIndex(
  health: TreasuryHealth,
  zScore: number | null,
  circuitOpen: boolean,
  maintenanceFrozen: boolean,
  dailyCap: number,
  budgetRemaining: number | null
): {
  stabilityIndex: number;
  tier: StabilityTier;
  components: { health: number; statisticalCalm: number; operationalHeadroom: number };
  headline: string;
} {
  const healthC = Math.min(100, Math.max(0, health.healthScore));

  let statisticalCalm = 88;
  if (zScore != null) {
    const absz = Math.abs(zScore);
    statisticalCalm = Math.max(0, Math.round(100 - absz * 16));
  }

  let operationalHeadroom = 100;
  if (circuitOpen) operationalHeadroom -= 48;
  if (maintenanceFrozen) operationalHeadroom -= 10;
  if (dailyCap > 0 && budgetRemaining != null) {
    const ratio = budgetRemaining / dailyCap;
    if (ratio < 0.1) operationalHeadroom -= 28;
    else if (ratio < 0.25) operationalHeadroom -= 14;
  }
  operationalHeadroom = Math.max(0, Math.min(100, operationalHeadroom));

  const stabilityIndex = Math.round(
    healthC * 0.5 + statisticalCalm * 0.32 + operationalHeadroom * 0.18
  );
  const clamped = Math.min(100, Math.max(0, stabilityIndex));

  let tier: StabilityTier = "stable";
  if (clamped >= 82) tier = "excellent";
  else if (clamped >= 62) tier = "stable";
  else if (clamped >= 38) tier = "strained";
  else tier = "critical";

  const headline =
    tier === "excellent"
      ? "Treasury operating inside comfortable statistical and policy bands."
      : tier === "stable"
        ? "Within normal variance — monitor drift and approval backlog."
        : tier === "strained"
          ? "Elevated stress: review z-score, runway, and safety gates."
          : "Critical posture — circuit, budget, or liquidity need immediate attention.";

  return {
    stabilityIndex: clamped,
    tier,
    components: {
      health: healthC,
      statisticalCalm,
      operationalHeadroom
    },
    headline
  };
}
