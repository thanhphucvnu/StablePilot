export type RiskLevel = "low" | "medium" | "high";

export type PolicyPresetName = "conservative" | "balanced" | "aggressive";

export type AutonomyModeName = "autonomous" | "approval";

export type PipelineLayerId = "rules" | "statistics" | "council" | "execution";

export interface PipelineStep {
  layer: PipelineLayerId;
  passed: boolean;
  summary: string;
}

export interface BalanceStatsSnapshot {
  sampleSize: number;
  meanDelta: number;
  stdDelta: number;
  lastDelta: number;
  zScore: number | null;
  anomalous: boolean;
}

export type RunOutcome =
  | "completed"
  | "no_action"
  | "cooldown_deferred"
  | "statistics_blocked"
  | "pending_approval"
  | "approval_executed"
  | "approval_wait"
  | "circuit_open"
  | "budget_blocked"
  | "maintenance_frozen";

export interface WalletSnapshot {
  walletId: string;
  usdtBalance: number;
  updatedAt: string;
}

export interface PolicyDecision {
  shouldAct: boolean;
  reason: string;
  amount: number;
  risk: RiskLevel;
}

export interface TransferResult {
  txId: string;
  success: boolean;
  message: string;
}

export interface AgentRunRecord {
  at: string;
  runId: number;
  beforeBalance: number;
  decision: PolicyDecision;
  transfer?: TransferResult;
  afterBalance: number;
  deferralReason?: "cooldown" | "approval_queue";
  pipeline?: PipelineStep[];
  stats?: BalanceStatsSnapshot;
  narrative?: string;
  outcome?: RunOutcome;
  approvalId?: string;
}
