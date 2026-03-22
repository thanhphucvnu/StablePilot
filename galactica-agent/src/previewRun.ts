import { getAutonomyMode, getFullHistoryForMetrics } from "./agent";
import { isCircuitOpen } from "./circuitBreaker";
import { config } from "./config";
import { getWalletSnapshot } from "./integrations/wdkClient";
import { buildTreasuryNarrative } from "./narrative";
import { buildGovernancePipeline } from "./pipeline";
import { decideAction } from "./policy";
import { getEffectivePolicy } from "./runtimePreset";
import { computeBalanceFlowStats } from "./statsEngine";
import { canSpend } from "./transferBudget";

/**
 * Hypothetical run: same math as production, no persistence and no WDK transfer.
 */
export async function runAgentPreview(hypotheticalBalance?: number) {
  const snapshot = await getWalletSnapshot();
  const balance =
    hypotheticalBalance != null &&
    Number.isFinite(hypotheticalBalance) &&
    hypotheticalBalance >= 0
      ? hypotheticalBalance
      : snapshot.usdtBalance;

  const history = getFullHistoryForMetrics();
  const stats = computeBalanceFlowStats(balance, history);
  const effective = getEffectivePolicy();
  const decision = decideAction(balance, effective);
  const approvalMode = getAutonomyMode() === "approval";
  const { pipeline, plan } = buildGovernancePipeline(
    decision,
    stats,
    config.governanceStrict,
    approvalMode
  );
  const narrative = buildTreasuryNarrative(decision, stats, pipeline, getAutonomyMode());

  const warnings: string[] = [];
  if (isCircuitOpen()) {
    warnings.push("Circuit breaker is OPEN — no outbound transfer would execute.");
  }
  if (config.dailyUsdtTransferCap > 0 && decision.shouldAct) {
    const b = canSpend(decision.amount, config.dailyUsdtTransferCap);
    if (!b.ok) {
      warnings.push(`Daily USDT cap would block this transfer (remaining ${b.remaining} USDT).`);
    }
  }

  return {
    preview: true,
    assumedBalanceUsdt: balance,
    walletId: snapshot.walletId,
    decision,
    stats,
    pipeline,
    executionPlan: plan,
    narrative,
    effectivePolicy: effective,
    warnings
  };
}
