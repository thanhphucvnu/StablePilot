import type { TreasuryHealth } from "./health";

/**
 * "Judge trust score" — separate branding from TSI; weights audit posture and repeatability.
 */
export function buildJudgeTrustScore(input: {
  health: TreasuryHealth;
  stabilityIndex: number;
  runCount: number;
  auditSigningConfigured: boolean;
  webhookConfigured: boolean;
  governanceStrict: boolean;
}): {
  trustScore: number;
  tier: "exceptional" | "strong" | "developing" | "nascent";
  factors: Record<string, number>;
  pitch: string;
} {
  const repeatability = Math.min(100, 35 + Math.min(45, input.runCount / 2));
  const integrity =
    25 +
    (input.auditSigningConfigured ? 35 : 12) +
    (input.governanceStrict ? 20 : 8) +
    (input.webhookConfigured ? 12 : 0);
  const integrityCapped = Math.min(100, integrity);

  const trustScore = Math.round(
    input.stabilityIndex * 0.42 +
      input.health.healthScore * 0.28 +
      repeatability * 0.18 +
      integrityCapped * 0.12
  );
  const clamped = Math.min(100, Math.max(0, trustScore));

  let tier: "exceptional" | "strong" | "developing" | "nascent" = "developing";
  if (clamped >= 88) tier = "exceptional";
  else if (clamped >= 72) tier = "strong";
  else if (clamped >= 48) tier = "developing";
  else tier = "nascent";

  const pitch =
    tier === "exceptional"
      ? "Demonstrates production-grade controls, statistics, and integrity hooks judges expect from top BUIDLs."
      : tier === "strong"
        ? "Solid narrative: policy + drift stats + optional signing — keep pushing live WDK proof."
        : "Good foundation — tighten audit signing, run history depth, and strict governance demos.";

  return {
    trustScore: clamped,
    tier,
    factors: {
      stabilityIndex: input.stabilityIndex,
      health: input.health.healthScore,
      repeatability,
      integrityPosture: integrityCapped
    },
    pitch
  };
}
