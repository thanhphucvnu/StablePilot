import { createHash } from "crypto";
import { config } from "./config";
import type { AutonomyModeName } from "./types";
import { getEffectivePolicy, getRuntimePreset } from "./runtimePreset";

/** Immutable fingerprint of active guardrails for compliance demos. */
export function buildPolicyFingerprint(autonomyMode: AutonomyModeName): {
  policyFingerprintSha256: string;
  preset: string;
  effectivePolicy: ReturnType<typeof getEffectivePolicy>;
  autonomyMode: AutonomyModeName;
  governanceStrict: boolean;
  governanceZThreshold: number;
  dailyUsdtTransferCap: number;
} {
  const effective = getEffectivePolicy();
  const payload = JSON.stringify({
    baseMin: config.minUsdtBalance,
    baseTarget: config.targetUsdtBalance,
    baseMaxTx: config.maxTxAmount,
    preset: getRuntimePreset(),
    effective,
    autonomy: autonomyMode,
    strict: config.governanceStrict,
    zTh: config.governanceZThreshold,
    dailyCap: config.dailyUsdtTransferCap,
    simulation: config.simulationMode
  });
  return {
    policyFingerprintSha256: createHash("sha256").update(payload, "utf8").digest("hex"),
    preset: getRuntimePreset(),
    effectivePolicy: effective,
    autonomyMode,
    governanceStrict: config.governanceStrict,
    governanceZThreshold: config.governanceZThreshold,
    dailyUsdtTransferCap: config.dailyUsdtTransferCap
  };
}
