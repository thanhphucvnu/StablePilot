import { isCircuitOpen } from "./circuitBreaker";
import { config } from "./config";
import { getAutonomyMode, getFullHistoryForMetrics, listPending } from "./agent";
import { getBudgetStatus } from "./transferBudget";

/** Prometheus/OpenMetrics style exposition for scraping. */
export function buildPrometheusMetrics(): string {
  const history = getFullHistoryForMetrics();
  const last = history[history.length - 1];
  const lines: string[] = [
    "# HELP stablepilot_info Service metadata",
    "# TYPE stablepilot_info gauge",
    `stablepilot_info{service="stablepilot",simulation="${config.simulationMode}"} 1`,
    "# HELP stablepilot_runs_total Total persisted agent runs loaded in memory",
    "# TYPE stablepilot_runs_total counter",
    `stablepilot_runs_total ${history.length}`,
    "# HELP stablepilot_pending_approvals Open human approvals",
    "# TYPE stablepilot_pending_approvals gauge",
    `stablepilot_pending_approvals ${listPending().length}`,
    "# HELP stablepilot_circuit_open Circuit breaker (1=open)",
    "# TYPE stablepilot_circuit_open gauge",
    `stablepilot_circuit_open ${isCircuitOpen() ? 1 : 0}`,
    "# HELP stablepilot_last_balance_usdt Last recorded beforeBalance from latest run",
    "# TYPE stablepilot_last_balance_usdt gauge",
    `stablepilot_last_balance_usdt ${last?.beforeBalance ?? 0}`,
    "# HELP stablepilot_autonomy Autonomy mode (1=approval required)",
    "# TYPE stablepilot_autonomy gauge",
    `stablepilot_autonomy{mode="${getAutonomyMode()}"} 1`
  ];
  const b = getBudgetStatus(config.dailyUsdtTransferCap);
  if (b.cap != null) {
    lines.push(
      "# HELP stablepilot_budget_remaining_usdt Daily cap headroom",
      "# TYPE stablepilot_budget_remaining_usdt gauge",
      `stablepilot_budget_remaining_usdt ${b.remaining ?? 0}`,
      "# HELP stablepilot_budget_spent_usdt Daily spend so far UTC",
      "# TYPE stablepilot_budget_spent_usdt gauge",
      `stablepilot_budget_spent_usdt ${b.spentUsdt}`
    );
  }
  return lines.join("\n") + "\n";
}
