import { PolicyDecision } from "./types";
import type { EffectivePolicy } from "./runtimePreset";

export function decideAction(currentUsdtBalance: number, policy: EffectivePolicy): PolicyDecision {
  if (currentUsdtBalance >= policy.minUsdtBalance) {
    return {
      shouldAct: false,
      reason: "Balance healthy, no rebalance needed.",
      amount: 0,
      risk: "low"
    };
  }

  const gap = policy.targetUsdtBalance - currentUsdtBalance;
  const amount = Math.min(Math.max(gap, 0), policy.maxTxAmount);

  if (amount <= 0) {
    return {
      shouldAct: false,
      reason: "Gap is non-positive after policy limits.",
      amount: 0,
      risk: "low"
    };
  }

  return {
    shouldAct: true,
    reason: `Balance below threshold (${policy.minUsdtBalance}). Rebalance required.`,
    amount,
    risk: amount >= policy.maxTxAmount ? "medium" : "low"
  };
}
