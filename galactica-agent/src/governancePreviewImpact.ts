import { isCircuitOpen } from "./circuitBreaker";
import { config } from "./config";
import { getCooldownRemainingMs } from "./agent";
import { isMaintenanceFrozen } from "./maintenance";
import { canSpend, getBudgetStatus } from "./transferBudget";

export function previewTransferImpact(amount: number): {
  amount: number;
  circuitOpen: boolean;
  maintenanceFrozen: boolean;
  cooldownRemainingMs: number;
  budget: ReturnType<typeof getBudgetStatus>;
  canSpendResult: { ok: boolean; remaining: number };
  wouldLikelyDefer: boolean;
  summary: string;
} {
  const budget = getBudgetStatus(config.dailyUsdtTransferCap);
  const spend = canSpend(amount, config.dailyUsdtTransferCap);
  const cd = getCooldownRemainingMs();
  const circuitOpen = isCircuitOpen();
  const maintenanceFrozen = isMaintenanceFrozen();
  const wouldLikelyDefer =
    circuitOpen ||
    maintenanceFrozen ||
    cd > 0 ||
    (config.dailyUsdtTransferCap > 0 && !spend.ok);

  let summary = "In autonomous path, this amount would be evaluated against policy + statistics.";
  if (circuitOpen) summary = "Circuit OPEN — no outbound transfer would execute.";
  else if (maintenanceFrozen) summary = "Maintenance FROZEN — execution skipped after governance.";
  else if (cd > 0) summary = `Cooldown active (${Math.ceil(cd / 1000)}s) — would defer.`;
  else if (config.dailyUsdtTransferCap > 0 && !spend.ok) {
    summary = `Daily cap — only ${spend.remaining} USDT headroom remaining.`;
  }

  return {
    amount,
    circuitOpen,
    maintenanceFrozen,
    cooldownRemainingMs: cd,
    budget,
    canSpendResult: spend,
    wouldLikelyDefer,
    summary
  };
}
