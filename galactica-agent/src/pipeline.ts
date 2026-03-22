import type { BalanceStatsSnapshot, PolicyDecision, PipelineStep } from "./types";

export type ExecutionPlan =
  | "execute_now"
  | "queue_approval"
  | "blocked_statistics"
  | "no_transfer";

export function buildGovernancePipeline(
  decision: PolicyDecision,
  stats: BalanceStatsSnapshot,
  governanceStrict: boolean,
  autonomyApprovalMode: boolean
): { pipeline: PipelineStep[]; plan: ExecutionPlan } {
  const statsPassed = !governanceStrict || !stats.anomalous;
  const pipeline: PipelineStep[] = [
    {
      layer: "rules",
      passed: true,
      summary: decision.shouldAct
        ? "Threshold breach — rebalance allowed by policy caps."
        : "Balance within guardrails; no transfer required."
    },
    {
      layer: "statistics",
      passed: statsPassed,
      summary:
        stats.zScore === null
          ? "Insufficient samples for z-score; statistics layer abstains."
          : `Last drift z=${stats.zScore.toFixed(2)} (strict=${governanceStrict ? "on" : "off"}).`
    },
    {
      layer: "council",
      passed: !decision.shouldAct || statsPassed,
      summary:
        "Treasury Sentinel + Risk Quants consensus: " +
        (decision.shouldAct && statsPassed
          ? "Proceed toward bounded top-up."
          : decision.shouldAct && !statsPassed
            ? "Halt — statistical anomaly vs recent flow."
            : "Stand down; monitor.")
    },
    {
      layer: "execution",
      passed: decision.shouldAct && statsPassed,
      summary: !decision.shouldAct
        ? "No execution."
        : !statsPassed
          ? "Blocked by governance strict mode."
          : autonomyApprovalMode
            ? "Human approval required before WDK transfer."
            : "Autonomous WDK transfer authorized."
    }
  ];

  let plan: ExecutionPlan = "no_transfer";
  if (!decision.shouldAct) plan = "no_transfer";
  else if (!statsPassed) plan = "blocked_statistics";
  else if (autonomyApprovalMode) plan = "queue_approval";
  else plan = "execute_now";

  return { pipeline, plan };
}
