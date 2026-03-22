import type { AgentRunRecord } from "./types";

export function buildGovernanceStats(rows: AgentRunRecord[]): {
  pendingApprovalRuns: number;
  approvalExecutedRuns: number;
  statisticsBlockedRuns: number;
  budgetBlockedRuns: number;
  maintenanceFrozenRuns: number;
} {
  const count = (o: string) => rows.filter((r) => r.outcome === o).length;
  return {
    pendingApprovalRuns: count("pending_approval"),
    approvalExecutedRuns: count("approval_executed"),
    statisticsBlockedRuns: count("statistics_blocked"),
    budgetBlockedRuns: count("budget_blocked"),
    maintenanceFrozenRuns: count("maintenance_frozen")
  };
}
