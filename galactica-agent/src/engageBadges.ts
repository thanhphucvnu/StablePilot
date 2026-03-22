import type { AgentRunRecord } from "./types";

export interface Badge {
  id: string;
  title: string;
  emoji: string;
  unlocked: boolean;
  detail: string;
}

export function buildEngageBadges(rows: AgentRunRecord[]): Badge[] {
  const n = rows.length;
  const transfersOk = rows.filter((r) => r.transfer?.success).length;
  const pendingEver = rows.filter((r) => r.outcome === "pending_approval").length;
  const strictBlocked = rows.filter((r) => r.outcome === "statistics_blocked").length;
  const approvalsDone = rows.filter((r) => r.outcome === "approval_executed").length;

  const badges: Badge[] = [
    {
      id: "first_pilot",
      title: "First pilot",
      emoji: "🚀",
      unlocked: n >= 1,
      detail: "Complete at least one agent run."
    },
    {
      id: "tenacious",
      title: "Tenacious",
      emoji: "🔁",
      unlocked: n >= 10,
      detail: "10+ runs in persisted history."
    },
    {
      id: "century",
      title: "Century orbit",
      emoji: "💯",
      unlocked: n >= 100,
      detail: "100+ runs — stress-test champion."
    },
    {
      id: "liquidity_engineer",
      title: "Liquidity engineer",
      emoji: "💧",
      unlocked: transfersOk >= 3,
      detail: "3+ successful simulated or WDK transfers recorded."
    },
    {
      id: "human_in_loop",
      title: "Human in the loop",
      emoji: "🧑‍⚖️",
      unlocked: pendingEver >= 1 || approvalsDone >= 1,
      detail: "Used approval mode outcomes at least once."
    },
    {
      id: "sigma_guardian",
      title: "Sigma guardian",
      emoji: "📉",
      unlocked: strictBlocked >= 1,
      detail: "Strict z-gate blocked a transfer — statistics did their job."
    }
  ];

  return badges;
}
