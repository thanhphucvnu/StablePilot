import type { PolicyPresetName } from "./types";
import { getPolicyMatrix } from "./runtimePreset";

export function diffPolicyPresets(
  from: PolicyPresetName,
  to: PolicyPresetName
): {
  from: PolicyPresetName;
  to: PolicyPresetName;
  delta: { minUsdtBalance: number; targetUsdtBalance: number; maxTxAmount: number };
  sideBySide: ReturnType<typeof getPolicyMatrix>;
} {
  const m = getPolicyMatrix();
  const A = m[from];
  const B = m[to];
  return {
    from,
    to,
    delta: {
      minUsdtBalance: B.minUsdtBalance - A.minUsdtBalance,
      targetUsdtBalance: B.targetUsdtBalance - A.targetUsdtBalance,
      maxTxAmount: B.maxTxAmount - A.maxTxAmount
    },
    sideBySide: m
  };
}
