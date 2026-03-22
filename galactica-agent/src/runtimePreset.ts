import { config } from "./config";
import type { PolicyPresetName } from "./types";

let currentPreset: PolicyPresetName = config.policyPreset;

export function setRuntimePreset(p: PolicyPresetName): void {
  currentPreset = p;
}

export function getRuntimePreset(): PolicyPresetName {
  return currentPreset;
}

export interface EffectivePolicy {
  minUsdtBalance: number;
  targetUsdtBalance: number;
  maxTxAmount: number;
}

const MULT: Record<PolicyPresetName, { min: number; target: number; max: number }> = {
  conservative: { min: 1.2, target: 1.12, max: 0.65 },
  balanced: { min: 1, target: 1, max: 1 },
  aggressive: { min: 0.88, target: 0.95, max: 1.35 }
};

function effectiveForPreset(p: PolicyPresetName): EffectivePolicy {
  const m = MULT[p];
  return {
    minUsdtBalance: Math.max(0, Math.round(config.minUsdtBalance * m.min)),
    targetUsdtBalance: Math.max(0, Math.round(config.targetUsdtBalance * m.target)),
    maxTxAmount: Math.max(1, Math.round(config.maxTxAmount * m.max))
  };
}

export function getEffectivePolicy(): EffectivePolicy {
  return effectiveForPreset(currentPreset);
}

/** Compare all presets against the same base .env without mutating runtime preset. */
export function getPolicyMatrix(): Record<PolicyPresetName, EffectivePolicy> {
  return {
    conservative: effectiveForPreset("conservative"),
    balanced: effectiveForPreset("balanced"),
    aggressive: effectiveForPreset("aggressive")
  };
}
