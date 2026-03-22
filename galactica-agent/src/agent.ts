import { pushActivity } from "./activityLog";
import { isCircuitOpen } from "./circuitBreaker";
import { config } from "./config";
import { decideAction } from "./policy";
import { buildTreasuryNarrative } from "./narrative";
import { buildGovernancePipeline } from "./pipeline";
import { getEffectivePolicy } from "./runtimePreset";
import { computeBalanceFlowStats } from "./statsEngine";
import { emitWebhook } from "./webhook";
import { getWalletSnapshot, transferUsdtToTreasury } from "./integrations/wdkClient";
import { persistHistory, loadPersistedHistory } from "./historyStore";
import {
  buildExecutedRecordFromApproval,
  createPendingApproval,
  hasOpenPending,
  listPendingApprovals,
  takePendingById
} from "./pendingApprovals";
import { canSpend, getBudgetStatus, recordSpend } from "./transferBudget";
import { isMaintenanceFrozen } from "./maintenance";
import type { AgentRunRecord, AutonomyModeName } from "./types";

let history: AgentRunRecord[] = loadPersistedHistory().map((r, idx) => ({
  ...r,
  runId: typeof r.runId === "number" && r.runId > 0 ? r.runId : idx + 1
}));
let nextRunId =
  history.length > 0 ? Math.max(...history.map((r) => r.runId), 0) + 1 : 1;
let lastTransferAt: number | null = null;
let autonomyMode: AutonomyModeName = config.autonomyMode;

function pushRecord(record: AgentRunRecord): void {
  history.push(record);
  history = history.slice(-500);
  persistHistory(history);
}

export function getAutonomyMode(): AutonomyModeName {
  return autonomyMode;
}

export function setAutonomyMode(mode: AutonomyModeName): void {
  autonomyMode = mode;
  pushActivity("autonomy", "Autonomy mode", mode);
}

export function getAgentHistory(): AgentRunRecord[] {
  return history.slice(-100);
}

export function getFullHistoryForMetrics(): AgentRunRecord[] {
  return history;
}

export function getHistoryRecordByRunId(runId: number): AgentRunRecord | undefined {
  return history.find((r) => r.runId === runId);
}

export function getLastTransferAt(): number | null {
  return lastTransferAt;
}

export function getCooldownRemainingMs(): number {
  if (!config.transferCooldownMs || lastTransferAt === null) return 0;
  const elapsed = Date.now() - lastTransferAt;
  return Math.max(0, config.transferCooldownMs - elapsed);
}

export function listPending(): ReturnType<typeof listPendingApprovals> {
  return listPendingApprovals();
}

export async function approvePendingTransfer(approvalId: string): Promise<AgentRunRecord | null> {
  if (isCircuitOpen()) return null;
  const pending = takePendingById(approvalId);
  if (!pending) return null;

  const transfer = await transferUsdtToTreasury(pending.decision.amount);
  let afterBalance = pending.beforeBalance;
  if (transfer.success) {
    afterBalance += pending.decision.amount;
    lastTransferAt = Date.now();
    recordSpend(pending.decision.amount, config.dailyUsdtTransferCap);
  }

  const record = buildExecutedRecordFromApproval(pending, {
    at: new Date().toISOString(),
    runId: nextRunId++,
    transfer,
    afterBalance
  });
  pushRecord(record);
  pushActivity(
    "approved",
    `Approved #${record.runId}`,
    `${pending.decision.amount} USDT · ${transfer.success ? transfer.txId : transfer.message}`
  );
  await emitWebhook(transfer.success ? "approval_transfer_ok" : "approval_transfer_fail", {
    approvalId,
    amount: pending.decision.amount,
    success: transfer.success,
    txId: transfer.txId
  });
  return record;
}

export function rejectPendingTransfer(approvalId: string): boolean {
  const pending = takePendingById(approvalId);
  if (!pending) return false;
  pushActivity("rejected", "Rejected proposal", approvalId);
  void emitWebhook("approval_rejected", { approvalId });
  return true;
}

export async function runAgentOnce(): Promise<AgentRunRecord> {
  const snapshot = await getWalletSnapshot();

  if (isCircuitOpen()) {
    const effective = getEffectivePolicy();
    const decision = decideAction(snapshot.usdtBalance, effective);
    const record: AgentRunRecord = {
      at: new Date().toISOString(),
      runId: nextRunId++,
      beforeBalance: snapshot.usdtBalance,
      decision,
      afterBalance: snapshot.usdtBalance,
      outcome: "circuit_open",
      narrative:
        "Global circuit breaker is OPEN — all outbound WDK transfers are disabled until an operator POSTs { open: false } to /safety/circuit."
    };
    pushRecord(record);
    pushActivity("safety", "Circuit breaker", `Run #${record.runId} blocked — no transfers while circuit open.`);
    await emitWebhook("circuit_blocked_run", { runId: record.runId, walletId: snapshot.walletId });
    return record;
  }

  if (isMaintenanceFrozen()) {
    const stats = computeBalanceFlowStats(snapshot.usdtBalance, history);
    const effective = getEffectivePolicy();
    const decision = decideAction(snapshot.usdtBalance, effective);
    const approvalMode = autonomyMode === "approval";
    const { pipeline } = buildGovernancePipeline(
      decision,
      stats,
      config.governanceStrict,
      approvalMode
    );
    const narrative = buildTreasuryNarrative(decision, stats, pipeline, autonomyMode);
    const record: AgentRunRecord = {
      at: new Date().toISOString(),
      runId: nextRunId++,
      beforeBalance: snapshot.usdtBalance,
      decision,
      afterBalance: snapshot.usdtBalance,
      pipeline,
      stats,
      narrative: `${narrative} Maintenance mode is ON — execution layer skipped.`,
      outcome: "maintenance_frozen"
    };
    pushRecord(record);
    pushActivity(
      "ops",
      `Run #${record.runId}`,
      "Maintenance freeze — governance evaluated; no WDK transfer."
    );
    return record;
  }

  const stats = computeBalanceFlowStats(snapshot.usdtBalance, history);
  const effective = getEffectivePolicy();
  const decision = decideAction(snapshot.usdtBalance, effective);
  const approvalMode = autonomyMode === "approval";
  const { pipeline, plan } = buildGovernancePipeline(
    decision,
    stats,
    config.governanceStrict,
    approvalMode
  );
  const narrative = buildTreasuryNarrative(
    decision,
    stats,
    pipeline,
    autonomyMode
  );

  if (!decision.shouldAct) {
    const record: AgentRunRecord = {
      at: new Date().toISOString(),
      runId: nextRunId++,
      beforeBalance: snapshot.usdtBalance,
      decision,
      afterBalance: snapshot.usdtBalance,
      pipeline,
      stats,
      narrative,
      outcome: "no_action"
    };
    pushRecord(record);
    pushActivity("run", `Run #${record.runId}`, "No transfer — policy satisfied.");
    return record;
  }

  if (plan === "blocked_statistics") {
    const record: AgentRunRecord = {
      at: new Date().toISOString(),
      runId: nextRunId++,
      beforeBalance: snapshot.usdtBalance,
      decision,
      afterBalance: snapshot.usdtBalance,
      pipeline,
      stats,
      narrative,
      outcome: "statistics_blocked"
    };
    pushRecord(record);
    pushActivity(
      "blocked",
      `Run #${record.runId}`,
      `Governance strict: |z|>${config.governanceZThreshold} — transfer blocked.`
    );
    await emitWebhook("transfer_blocked_statistics", {
      walletId: snapshot.walletId,
      zScore: stats.zScore,
      amount: decision.amount
    });
    return record;
  }

  if (plan === "queue_approval") {
    if (hasOpenPending()) {
      const record: AgentRunRecord = {
        at: new Date().toISOString(),
        runId: nextRunId++,
        beforeBalance: snapshot.usdtBalance,
        decision,
        afterBalance: snapshot.usdtBalance,
        pipeline,
        stats,
        narrative,
        deferralReason: "approval_queue",
        outcome: "approval_wait"
      };
      pushRecord(record);
      pushActivity("run", `Run #${record.runId}`, "Prior approval still open — no duplicate proposal.");
      return record;
    }

    const pending = createPendingApproval({
      walletId: snapshot.walletId,
      beforeBalance: snapshot.usdtBalance,
      decision,
      pipeline,
      stats,
      narrative
    });
    const record: AgentRunRecord = {
      at: new Date().toISOString(),
      runId: nextRunId++,
      beforeBalance: snapshot.usdtBalance,
      decision,
      afterBalance: snapshot.usdtBalance,
      pipeline,
      stats,
      narrative,
      outcome: "pending_approval",
      approvalId: pending.id
    };
    pushRecord(record);
    pushActivity("proposal", "Approval required", `${pending.id} · ${decision.amount} USDT`);
    await emitWebhook("approval_required", {
      approvalId: pending.id,
      amount: decision.amount,
      walletId: snapshot.walletId,
      narrative
    });
    return record;
  }

  let afterBalance = snapshot.usdtBalance;
  let transfer: AgentRunRecord["transfer"];
  let deferralReason: AgentRunRecord["deferralReason"];

  const remaining = getCooldownRemainingMs();
  if (remaining > 0) {
    deferralReason = "cooldown";
    const record: AgentRunRecord = {
      at: new Date().toISOString(),
      runId: nextRunId++,
      beforeBalance: snapshot.usdtBalance,
      decision,
      afterBalance: snapshot.usdtBalance,
      deferralReason,
      pipeline,
      stats,
      narrative,
      outcome: "cooldown_deferred"
    };
    pushRecord(record);
    await emitWebhook("transfer_deferred_cooldown", {
      walletId: snapshot.walletId,
      intendedAmount: decision.amount,
      cooldownRemainingMs: remaining
    });
    pushActivity("run", `Run #${record.runId}`, "Cooldown active — transfer deferred.");
    return record;
  }

  if (config.dailyUsdtTransferCap > 0) {
    const budget = canSpend(decision.amount, config.dailyUsdtTransferCap);
    const snap = getBudgetStatus(config.dailyUsdtTransferCap);
    if (!budget.ok) {
      const record: AgentRunRecord = {
        at: new Date().toISOString(),
        runId: nextRunId++,
        beforeBalance: snapshot.usdtBalance,
        decision,
        afterBalance: snapshot.usdtBalance,
        pipeline,
        stats,
        narrative: `Daily USDT transfer cap ${config.dailyUsdtTransferCap} exceeded or insufficient headroom. Spent ${snap.spentUsdt} USDT on ${snap.utcDay} UTC; remaining ${budget.remaining}.`,
        outcome: "budget_blocked"
      };
      pushRecord(record);
      pushActivity(
        "safety",
        `Run #${record.runId}`,
        `Budget blocked — need ${decision.amount} USDT, remaining ${budget.remaining}.`
      );
      await emitWebhook("transfer_budget_blocked", {
        walletId: snapshot.walletId,
        amount: decision.amount,
        remaining: budget.remaining,
        cap: config.dailyUsdtTransferCap
      });
      return record;
    }
  }

  transfer = await transferUsdtToTreasury(decision.amount);
  if (transfer.success) {
    afterBalance += decision.amount;
    lastTransferAt = Date.now();
    recordSpend(decision.amount, config.dailyUsdtTransferCap);
  }

  await emitWebhook(transfer.success ? "transfer_executed" : "transfer_failed", {
    walletId: snapshot.walletId,
    amount: decision.amount,
    success: transfer.success,
    txId: transfer.txId,
    message: transfer.message
  });

  const record: AgentRunRecord = {
    at: new Date().toISOString(),
    runId: nextRunId++,
    beforeBalance: snapshot.usdtBalance,
    decision,
    transfer,
    afterBalance,
    pipeline,
    stats,
    narrative,
    outcome: "completed"
  };

  pushRecord(record);
  pushActivity(
    "run",
    `Run #${record.runId}`,
    transfer.success ? `Transferred ${decision.amount} USDT` : `Transfer failed: ${transfer.message}`
  );
  return record;
}
