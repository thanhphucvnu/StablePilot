import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import express, { type Request, type Response } from "express";
import {
  clearActivityFeed,
  getActivityFeed,
  pushActivity,
  subscribeActivity
} from "./activityLog";
import { isCircuitOpen, setCircuitOpen } from "./circuitBreaker";
import { config } from "./config";
import {
  approvePendingTransfer,
  getAgentHistory,
  getAutonomyMode,
  getCooldownRemainingMs,
  getFullHistoryForMetrics,
  getHistoryRecordByRunId,
  getLastTransferAt,
  listPending,
  rejectPendingTransfer,
  runAgentOnce,
  setAutonomyMode
} from "./agent";
import { buildAuditBundle } from "./auditBundle";
import { buildPolicyFingerprint } from "./policyFingerprint";
import { canSpend, getBudgetStatus } from "./transferBudget";
import { explainRunForJudges } from "./llmExplain";
import { getPortfolioAggregate, setSatelliteBalance } from "./portfolioSim";
import { applyScenarioChain, applySimulationShock } from "./stressLab";
import { emitWebhook } from "./webhook";
import {
  getAllWalletSnapshots,
  getRecentWalletSnapshots,
  getWalletSnapshot,
  setSimulatedBalance
} from "./integrations/wdkClient";
import { buildAttestationSnapshot } from "./attestationSnapshot";
import { buildComplianceExport } from "./complianceExport";
import { buildFeatureCatalog } from "./featureCatalog";
import { buildInnovationManifest } from "./innovationManifest";
import { buildGovernanceStats } from "./governanceStats";
import {
  buildActivityReport,
  buildRunAnalytics,
  filterTransferLedger
} from "./insightsAnalytics";
import { buildJudgeBriefing } from "./judgeBriefing";
import { explorerUrlForTx } from "./explorerLink";
import { buildTreasuryHealth } from "./health";
import { isMaintenanceFrozen, setMaintenanceFrozen } from "./maintenance";
import { buildTreasuryStabilityIndex } from "./stabilityIndex";
import { buildPrometheusMetrics } from "./metricsText";
import { buildOpenApiJson } from "./openApiSpec";
import { buildPipelineDocumentation } from "./pipelineDoc";
import { runAgentPreview } from "./previewRun";
import {
  getEffectiveRunIntervalMs,
  getRunIntervalOverrideMs,
  setRunIntervalOverrideMs
} from "./runtimeInterval";
import {
  getEffectivePolicy,
  getPolicyMatrix,
  getRuntimePreset,
  setRuntimePreset
} from "./runtimePreset";
import { computeBalanceFlowStats } from "./statsEngine";
import { buildTreasurySummary } from "./treasurySummary";
import { resetDailySpendCounter } from "./transferBudget";
import { readPackageVersion } from "./versionInfo";
import { buildBalanceHeatmap } from "./balanceHeatmap";
import { routeBotCommand } from "./botCommands";
import { buildChangelog } from "./changelog";
import { compareAgentRuns } from "./compareRuns";
import { buildCurlBundle } from "./curlBundle";
import { buildEngageBadges } from "./engageBadges";
import { buildActivityStreak } from "./engageStreak";
import { previewTransferImpact } from "./governancePreviewImpact";
import {
  getTreasuryGoal,
  getTreasuryGoalWithProgress,
  setTreasuryGoal
} from "./goalsStore";
import { buildOnePagerMarkdown } from "./onePagerBrief";
import { diffPolicyPresets } from "./policyDiff";
import { buildProofOfRun } from "./proofOfRun";
import { buildPublicStatusCard } from "./publicStatusCard";
import { recordRequest, getRequestStats } from "./requestStats";
import { buildRiskRadar } from "./riskRadar";
import { buildRunwayWhatIf } from "./runwayWhatIf";
import { listSimulationPresetNames, SIMULATION_SCENARIO_PRESETS } from "./simulationPresets";
import { buildJudgeTrustScore } from "./trustScore";
import { buildWebhookEventCatalog } from "./webhookCatalog";
import type { AutonomyModeName, PolicyPresetName } from "./types";
import { AgentRunRecord } from "./types";

const app = express();
app.use(express.json());

if (config.enableCors) {
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", config.corsOrigin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, X-Ops-Token, X-Request-Id"
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });
}

app.use((req, res, next) => {
  const raw = req.headers["x-request-id"];
  const rid =
    typeof raw === "string" && raw.trim() ? raw.trim() : randomUUID();
  res.setHeader("X-Request-Id", rid);
  next();
});

app.use((req, _res, next) => {
  recordRequest(req.path || "/");
  next();
});

/** Browsers request /favicon.ico by default; serve the same mark as logo.svg with correct Content-Type. */
const logoSvgPath = path.join(process.cwd(), "public", "logo.svg");
app.get("/favicon.ico", (_req, res) => {
  res.sendFile(logoSvgPath);
});

app.use(express.static("public"));

let intervalRef: NodeJS.Timeout | null = null;

function allowSensitiveOp(req: Request): boolean {
  if (config.simulationMode) return true;
  const tok = config.opsToken?.trim();
  if (!tok) return false;
  return req.headers["x-ops-token"] === tok;
}

function rescheduleAgentLoop(): void {
  if (!intervalRef) return;
  clearInterval(intervalRef);
  intervalRef = setInterval(async () => {
    try {
      await runAgentOnce();
    } catch (error) {
      console.error("Agent run failed:", error);
    }
  }, getEffectiveRunIntervalMs());
}

function isValidPreset(p: string): p is PolicyPresetName {
  return p === "conservative" || p === "balanced" || p === "aggressive";
}

function isValidAutonomy(p: string): p is AutonomyModeName {
  return p === "autonomous" || p === "approval";
}

function rowToCsv(r: AgentRunRecord): string {
  const z = r.stats?.zScore != null ? r.stats.zScore.toFixed(4) : "";
  const cells = [
    r.runId,
    r.at,
    r.beforeBalance,
    r.afterBalance,
    r.decision.shouldAct,
    r.decision.amount,
    r.decision.reason.replace(/"/g, '""'),
    r.transfer?.success ?? "",
    r.transfer?.txId ?? "",
    r.deferralReason ?? "",
    r.outcome ?? "",
    z,
    (r.narrative ?? "").slice(0, 200).replace(/"/g, '""')
  ];
  return cells.map((c) => `"${String(c)}"`).join(",");
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    simulationMode: config.simulationMode,
    runIntervalMs: config.runIntervalMs,
    webhookConfigured: Boolean(config.webhookUrl?.trim()),
    transferCooldownMs: config.transferCooldownMs,
    autonomyMode: getAutonomyMode(),
    governanceStrict: config.governanceStrict,
    governanceZThreshold: config.governanceZThreshold,
    explainEnabled: Boolean(config.openaiApiKey?.trim()),
    circuitOpen: isCircuitOpen(),
    budget: getBudgetStatus(config.dailyUsdtTransferCap),
    dailyUsdtTransferCap: config.dailyUsdtTransferCap,
    auditSigningConfigured: Boolean(config.auditSigningSecret?.trim()),
    txExplorerTemplateConfigured: Boolean(config.blockExplorerTxUrlTemplate.trim()),
    maintenanceFrozen: isMaintenanceFrozen(),
    effectiveRunIntervalMs: getEffectiveRunIntervalMs(),
    secondaryWalletConfigured: Boolean(config.wdkSecondaryWalletId?.trim()),
    webhookHmacConfigured: Boolean(config.webhookHmacSecret?.trim())
  });
});

app.get("/health/ready", async (_req, res) => {
  try {
    const snapshot = await getWalletSnapshot();
    res.json({
      ready: true,
      walletId: snapshot.walletId,
      usdtBalance: snapshot.usdtBalance,
      updatedAt: snapshot.updatedAt
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error instanceof Error ? error.message : "Wallet unavailable"
    });
  }
});

app.get("/version", (_req, res) => {
  res.json({
    service: "StablePilot",
    version: readPackageVersion()
  });
});

app.get("/time", (_req, res) => {
  const now = new Date();
  res.json({ iso: now.toISOString(), unixMs: now.getTime() });
});

app.get("/features", (_req, res) => {
  res.json(buildFeatureCatalog());
});

app.get("/metrics", (_req, res) => {
  res.type("text/plain; version=0.0.4; charset=utf-8");
  res.send(buildPrometheusMetrics());
});

app.get("/openapi.json", (_req, res) => {
  res.json(buildOpenApiJson());
});

app.get("/limits", (_req, res) => {
  res.json({
    maxTxAmount: config.maxTxAmount,
    minUsdtBalance: config.minUsdtBalance,
    targetUsdtBalance: config.targetUsdtBalance,
    transferCooldownMs: config.transferCooldownMs,
    dailyUsdtTransferCap: config.dailyUsdtTransferCap,
    governanceZThreshold: config.governanceZThreshold,
    runIntervalBoundsMs: { min: 3000, max: 3_600_000 },
    agentBatchRunMax: 10,
    previewCompareMax: 8,
    scenarioChainMaxSteps: 12
  });
});

app.get("/policy/matrix", (_req, res) => {
  res.json({
    basePolicy: {
      minUsdtBalance: config.minUsdtBalance,
      targetUsdtBalance: config.targetUsdtBalance,
      maxTxAmount: config.maxTxAmount
    },
    effectiveByPreset: getPolicyMatrix(),
    runtimePreset: getRuntimePreset()
  });
});

app.get("/insights/stability-index", async (_req, res) => {
  try {
    const snapshot = await getWalletSnapshot();
    const history = getFullHistoryForMetrics();
    const health = buildTreasuryHealth(
      snapshot.usdtBalance,
      history,
      getCooldownRemainingMs(),
      getLastTransferAt()
    );
    const stats = computeBalanceFlowStats(snapshot.usdtBalance, history);
    const b = getBudgetStatus(config.dailyUsdtTransferCap);
    const tsi = buildTreasuryStabilityIndex(
      health,
      stats.zScore,
      isCircuitOpen(),
      isMaintenanceFrozen(),
      config.dailyUsdtTransferCap,
      b.remaining
    );
    res.json({
      walletId: snapshot.walletId,
      usdtBalance: snapshot.usdtBalance,
      ...tsi,
      zScore: stats.zScore,
      healthStatus: health.status
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/attestation/snapshot", (_req, res) => {
  res.json(buildAttestationSnapshot(getFullHistoryForMetrics(), getAutonomyMode()));
});

app.get("/innovation/manifest", (_req, res) => {
  res.json(buildInnovationManifest());
});

app.get("/wallet/snapshots/all", async (_req, res) => {
  try {
    res.json(await getAllWalletSnapshots());
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/lab/scenario-chain", (req, res) => {
  if (!config.simulationMode) {
    return res.status(400).json({ error: "Simulation only." });
  }
  const steps = req.body?.steps;
  if (!Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({
      error: "body needs { steps: [{ kind, magnitude }, ...] }"
    });
  }
  const sliced = steps.slice(0, 12);
  const normalized: { kind: "flash_drop" | "sudden_inflow" | "drain_small"; magnitude: number }[] =
    [];
  for (const s of sliced) {
    const kind = s?.kind;
    const magnitude = Number(s?.magnitude);
    if (kind !== "flash_drop" && kind !== "sudden_inflow" && kind !== "drain_small") {
      return res.status(400).json({ error: "each step.kind must be flash_drop | sudden_inflow | drain_small" });
    }
    if (!Number.isFinite(magnitude)) {
      return res.status(400).json({ error: "each step.magnitude must be a number" });
    }
    normalized.push({ kind, magnitude });
  }
  const result = applyScenarioChain(normalized);
  pushActivity(
    "lab",
    "Scenario chain",
    `${normalized.length} shocks · ${result.initialBalance}→${result.finalBalance} USDT`
  );
  res.json({ ok: true, ...result });
});

app.get("/engage/badges", (_req, res) => {
  res.json({ badges: buildEngageBadges(getFullHistoryForMetrics()) });
});

app.get("/engage/streak", (_req, res) => {
  res.json(buildActivityStreak(getFullHistoryForMetrics()));
});

app.get("/insights/risk-radar", async (_req, res) => {
  try {
    const snapshot = await getWalletSnapshot();
    const history = getFullHistoryForMetrics();
    const health = buildTreasuryHealth(
      snapshot.usdtBalance,
      history,
      getCooldownRemainingMs(),
      getLastTransferAt()
    );
    const stats = computeBalanceFlowStats(snapshot.usdtBalance, history);
    const b = getBudgetStatus(config.dailyUsdtTransferCap);
    res.json(
      buildRiskRadar({
        health,
        stats,
        circuitOpen: isCircuitOpen(),
        maintenanceFrozen: isMaintenanceFrozen(),
        openApprovals: listPending().length,
        dailyCap: config.dailyUsdtTransferCap,
        budgetRemaining: b.remaining
      })
    );
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/insights/runway-whatif", async (req, res) => {
  const burn = Number(req.body?.burnPerDay ?? req.body?.burn);
  if (!Number.isFinite(burn)) {
    return res.status(400).json({ error: "body needs { burnPerDay: number }" });
  }
  try {
    const snapshot = await getWalletSnapshot();
    const eff = getEffectivePolicy();
    res.json(buildRunwayWhatIf(snapshot.usdtBalance, eff.minUsdtBalance, burn));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/insights/compare-runs", (req, res) => {
  const a = Number(req.query.a);
  const b = Number(req.query.b);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return res.status(400).json({ error: "query needs numeric a and b (runIds)" });
  }
  const ra = getHistoryRecordByRunId(a);
  const rb = getHistoryRecordByRunId(b);
  res.json(compareAgentRuns(ra, rb));
});

app.get("/policy/diff", (req, res) => {
  const from = String(req.query.from ?? "").toLowerCase();
  const to = String(req.query.to ?? "").toLowerCase();
  if (!isValidPreset(from) || !isValidPreset(to)) {
    return res.status(400).json({
      error: "query from and to must be conservative | balanced | aggressive"
    });
  }
  res.json(diffPolicyPresets(from, to));
});

app.get("/insights/balance-heatmap", (_req, res) => {
  res.json(buildBalanceHeatmap(getFullHistoryForMetrics()));
});

app.get("/webhooks/catalog", (_req, res) => {
  res.json(buildWebhookEventCatalog());
});

app.get("/proof/run/:runId", (req, res) => {
  const id = Number(req.params.runId);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "invalid runId" });
  }
  const record = getHistoryRecordByRunId(id);
  const p = buildProofOfRun(record);
  if (!p.ok) {
    return res.status(404).json({ error: "runId not found in persisted history" });
  }
  res.json(p);
});

app.get("/devtools/curl-bundle", (req, res) => {
  const host = req.get("host") ?? `localhost:${config.port}`;
  const proto = req.protocol === "http" || req.protocol === "https" ? req.protocol : "http";
  const base = `${proto}://${host}`;
  res.type("text/plain; charset=utf-8");
  res.send(buildCurlBundle(base));
});

app.get("/meta/changelog", (_req, res) => {
  res.json(buildChangelog());
});

app.get("/meta/feature-flags", (_req, res) => {
  res.json({
    simulationMode: config.simulationMode,
    governanceStrict: config.governanceStrict,
    explainEnabled: Boolean(config.openaiApiKey?.trim()),
    webhookConfigured: Boolean(config.webhookUrl?.trim()),
    webhookHmacConfigured: Boolean(config.webhookHmacSecret?.trim()),
    auditSigningConfigured: Boolean(config.auditSigningSecret?.trim()),
    secondaryWalletConfigured: Boolean(config.wdkSecondaryWalletId?.trim()),
    corsEnabled: config.enableCors
  });
});

app.get("/meta/request-stats", (_req, res) => {
  res.json(getRequestStats());
});

app.post("/integrations/command", (req, res) => {
  const text = req.body?.text ?? req.body?.command;
  if (typeof text !== "string") {
    return res.status(400).json({ error: "body needs { text: string }" });
  }
  res.json(routeBotCommand(text));
});

app.get("/goals/treasury", async (_req, res) => {
  try {
    const snapshot = await getWalletSnapshot();
    const eff = getEffectivePolicy();
    res.json(getTreasuryGoalWithProgress(snapshot.usdtBalance, eff.targetUsdtBalance));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/goals/treasury", (req, res) => {
  const target = req.body?.targetUsdt ?? req.body?.target;
  if (target === null || target === "clear") {
    setTreasuryGoal(null);
    return res.json(getTreasuryGoal());
  }
  const n = Number(target);
  if (!Number.isFinite(n) || n < 0) {
    return res.status(400).json({ error: "body needs { targetUsdt: number } or clear" });
  }
  const label = typeof req.body?.label === "string" ? req.body.label : "";
  setTreasuryGoal(n, label);
  pushActivity("ops", "Treasury goal", `Target ${n} USDT${label ? ` — ${label}` : ""}`);
  return res.json(getTreasuryGoal());
});

app.post("/governance/preview-impact", (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({ error: "body needs { amount: number }" });
  }
  res.json(previewTransferImpact(amount));
});

app.get("/public/status", async (_req, res) => {
  try {
    const snapshot = await getWalletSnapshot();
    const history = getFullHistoryForMetrics();
    const health = buildTreasuryHealth(
      snapshot.usdtBalance,
      history,
      getCooldownRemainingMs(),
      getLastTransferAt()
    );
    const stats = computeBalanceFlowStats(snapshot.usdtBalance, history);
    const b = getBudgetStatus(config.dailyUsdtTransferCap);
    const tsi = buildTreasuryStabilityIndex(
      health,
      stats.zScore,
      isCircuitOpen(),
      isMaintenanceFrozen(),
      config.dailyUsdtTransferCap,
      b.remaining
    );
    res.json(
      buildPublicStatusCard({
        simulationMode: config.simulationMode,
        autonomyMode: getAutonomyMode(),
        circuitOpen: isCircuitOpen(),
        healthScore: health.healthScore,
        healthStatus: health.status,
        stabilityIndex: tsi.stabilityIndex,
        stabilityTier: tsi.tier,
        usdtBalance: snapshot.usdtBalance
      })
    );
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/insights/trust-score", async (_req, res) => {
  try {
    const snapshot = await getWalletSnapshot();
    const history = getFullHistoryForMetrics();
    const health = buildTreasuryHealth(
      snapshot.usdtBalance,
      history,
      getCooldownRemainingMs(),
      getLastTransferAt()
    );
    const stats = computeBalanceFlowStats(snapshot.usdtBalance, history);
    const b = getBudgetStatus(config.dailyUsdtTransferCap);
    const tsi = buildTreasuryStabilityIndex(
      health,
      stats.zScore,
      isCircuitOpen(),
      isMaintenanceFrozen(),
      config.dailyUsdtTransferCap,
      b.remaining
    );
    res.json(
      buildJudgeTrustScore({
        health,
        stabilityIndex: tsi.stabilityIndex,
        runCount: history.length,
        auditSigningConfigured: Boolean(config.auditSigningSecret?.trim()),
        webhookConfigured: Boolean(config.webhookUrl?.trim()),
        governanceStrict: config.governanceStrict
      })
    );
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/briefing/onepager", async (_req, res) => {
  try {
    const snapshot = await getWalletSnapshot();
    const history = getFullHistoryForMetrics();
    const health = buildTreasuryHealth(
      snapshot.usdtBalance,
      history,
      getCooldownRemainingMs(),
      getLastTransferAt()
    );
    const stats = computeBalanceFlowStats(snapshot.usdtBalance, history);
    const b = getBudgetStatus(config.dailyUsdtTransferCap);
    const tsi = buildTreasuryStabilityIndex(
      health,
      stats.zScore,
      isCircuitOpen(),
      isMaintenanceFrozen(),
      config.dailyUsdtTransferCap,
      b.remaining
    );
    const trust = buildJudgeTrustScore({
      health,
      stabilityIndex: tsi.stabilityIndex,
      runCount: history.length,
      auditSigningConfigured: Boolean(config.auditSigningSecret?.trim()),
      webhookConfigured: Boolean(config.webhookUrl?.trim()),
      governanceStrict: config.governanceStrict
    });
    const md = buildOnePagerMarkdown({
      walletId: snapshot.walletId,
      usdtBalance: snapshot.usdtBalance,
      healthScore: health.healthScore,
      healthStatus: health.status,
      stabilityIndex: tsi.stabilityIndex,
      stabilityTier: tsi.tier,
      trustScore: trust.trustScore,
      trustTier: trust.tier,
      autonomyMode: getAutonomyMode(),
      openApprovals: listPending().length,
      circuitOpen: isCircuitOpen(),
      runCount: history.length
    });
    res.type("text/markdown; charset=utf-8");
    res.send(md);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/sim/presets", (_req, res) => {
  res.json({
    simulationMode: config.simulationMode,
    presets: listSimulationPresetNames(),
    count: listSimulationPresetNames().length
  });
});

app.get("/treasury/summary", async (_req, res) => {
  try {
    res.json(await buildTreasurySummary(Boolean(intervalRef)));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/runtime/interval", (_req, res) => {
  res.json({
    effectiveMs: getEffectiveRunIntervalMs(),
    overrideMs: getRunIntervalOverrideMs(),
    envDefaultMs: config.runIntervalMs
  });
});

app.post("/runtime/interval", (req, res) => {
  const raw = req.body?.ms ?? req.body?.runIntervalMs;
  if (raw === null || raw === "clear" || raw === undefined) {
    setRunIntervalOverrideMs(null);
  } else {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      return res.status(400).json({ error: "body needs { ms: number } or null to clear" });
    }
    setRunIntervalOverrideMs(n);
  }
  rescheduleAgentLoop();
  res.json({
    effectiveMs: getEffectiveRunIntervalMs(),
    overrideMs: getRunIntervalOverrideMs()
  });
});

app.get("/maintenance", (_req, res) => {
  res.json({ frozen: isMaintenanceFrozen() });
});

app.post("/maintenance", (req, res) => {
  const frozen = req.body?.frozen ?? req.body?.enable;
  if (typeof frozen !== "boolean") {
    return res.status(400).json({ error: "body needs { frozen: boolean }" });
  }
  setMaintenanceFrozen(frozen);
  res.json({ frozen: isMaintenanceFrozen() });
});

app.get("/insights/analytics", (_req, res) => {
  res.json(buildRunAnalytics(getFullHistoryForMetrics()));
});

app.get("/insights/zstats", async (_req, res) => {
  try {
    const snapshot = await getWalletSnapshot();
    const stats = computeBalanceFlowStats(
      snapshot.usdtBalance,
      getFullHistoryForMetrics()
    );
    res.json({ walletId: snapshot.walletId, balance: snapshot.usdtBalance, stats });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/report/activity", (_req, res) => {
  const rows = getFullHistoryForMetrics();
  res.json(buildActivityReport(rows, getActivityFeed().length));
});

app.get("/ledger/transfers", (_req, res) => {
  res.json(filterTransferLedger(getFullHistoryForMetrics()));
});

app.get("/pipeline/layers", (_req, res) => {
  res.json(buildPipelineDocumentation());
});

app.get("/governance/stats", (_req, res) => {
  res.json(buildGovernanceStats(getFullHistoryForMetrics()));
});

app.get("/export/compliance", async (_req, res) => {
  try {
    const body = await buildComplianceExport(
      getAutonomyMode(),
      getFullHistoryForMetrics(),
      Boolean(intervalRef)
    );
    res.json(body);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/wallet/snapshots/recent", (_req, res) => {
  res.json({ snapshots: getRecentWalletSnapshots() });
});

app.post("/agent/run/batch", async (req, res) => {
  const n = Math.min(10, Math.max(1, Math.floor(Number(req.body?.count ?? 1))));
  const results: Array<AgentRunRecord & { explorerUrl: string | null }> = [];
  try {
    for (let i = 0; i < n; i += 1) {
      const run = await runAgentOnce();
      const explorer =
        run.transfer?.txId && run.transfer.success
          ? explorerUrlForTx(run.transfer.txId)
          : null;
      results.push({ ...run, explorerUrl: explorer });
    }
    res.json({ count: n, runs: results });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/agent/preview/compare", async (req, res) => {
  const raw = req.body?.balances ?? req.body?.usdtBalances;
  if (!Array.isArray(raw) || raw.length === 0) {
    return res.status(400).json({ error: "body needs balances: number[]" });
  }
  const balances = raw.slice(0, 8).map((x: unknown) => Number(x));
  if (balances.some((b) => !Number.isFinite(b) || b < 0)) {
    return res.status(400).json({ error: "each balance must be a non-negative number" });
  }
  try {
    const previews = [];
    for (const b of balances) {
      previews.push(await runAgentPreview(b));
    }
    res.json({ count: previews.length, previews });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/ops/webhook/test", async (_req, res) => {
  await emitWebhook("ops_ping", { message: "manual test from POST /ops/webhook/test" });
  res.json({
    ok: true,
    note: config.webhookUrl?.trim()
      ? "Webhook POST attempted (see server logs if delivery failed)."
      : "WEBHOOK_URL not set — nothing was sent."
  });
});

app.post("/ops/activity/clear", (req, res) => {
  if (!allowSensitiveOp(req)) {
    return res.status(403).json({
      error: "Forbidden — use simulation mode or set OPS_TOKEN and X-Ops-Token header."
    });
  }
  clearActivityFeed();
  pushActivity("ops", "Activity feed", "Cleared via POST /ops/activity/clear");
  res.json({ cleared: true });
});

app.post("/safety/budget/reset", (req, res) => {
  if (!allowSensitiveOp(req)) {
    return res.status(403).json({
      error: "Forbidden — use simulation mode or set OPS_TOKEN and X-Ops-Token header."
    });
  }
  resetDailySpendCounter();
  pushActivity("ops", "Daily budget", "Counter reset via POST /safety/budget/reset");
  res.json({ ok: true, budget: getBudgetStatus(config.dailyUsdtTransferCap) });
});

app.post("/sim/scenario", (req, res) => {
  if (!config.simulationMode) {
    return res.status(400).json({ error: "Simulation only." });
  }
  const name = String(req.body?.scenario ?? req.body?.name ?? "").toLowerCase();
  const bal = SIMULATION_SCENARIO_PRESETS[name];
  if (bal === undefined) {
    return res.status(400).json({
      error: "unknown scenario",
      known: listSimulationPresetNames()
    });
  }
  setSimulatedBalance(bal);
  pushActivity("lab", "Sim scenario", `${name} → ${bal} USDT`);
  return res.json({ ok: true, scenario: name, usdtBalance: bal });
});

app.post("/utils/echo", (req, res) => {
  res.json({ body: req.body ?? null, at: new Date().toISOString() });
});

app.post("/utils/hash", (req, res) => {
  const text = req.body?.text;
  if (typeof text !== "string") {
    return res.status(400).json({ error: "body needs { text: string }" });
  }
  const hex = createHash("sha256").update(text, "utf8").digest("hex");
  res.json({ algorithm: "sha256", hex, length: text.length });
});

app.get("/agent/status", (_req, res) => {
  res.json({
    running: Boolean(intervalRef),
    runIntervalMs: getEffectiveRunIntervalMs(),
    runIntervalEnvMs: config.runIntervalMs,
    runIntervalOverrideMs: getRunIntervalOverrideMs(),
    preset: getRuntimePreset(),
    cooldownRemainingMs: getCooldownRemainingMs(),
    autonomyMode: getAutonomyMode(),
    openApprovals: listPending().length,
    maintenanceFrozen: isMaintenanceFrozen()
  });
});

app.get("/agent/config", (_req, res) => {
  const effective = getEffectivePolicy();
  res.json({
    simulationMode: config.simulationMode,
    walletId: config.wdkWalletId,
    basePolicy: {
      minUsdtBalance: config.minUsdtBalance,
      targetUsdtBalance: config.targetUsdtBalance,
      maxTxAmount: config.maxTxAmount
    },
    effectivePolicy: effective,
    preset: getRuntimePreset(),
    transferCooldownMs: config.transferCooldownMs,
    webhookUrl: config.webhookUrl ? "(configured)" : "",
    autonomyMode: getAutonomyMode(),
    governanceStrict: config.governanceStrict,
    governanceZThreshold: config.governanceZThreshold,
    blockExplorerTxUrlTemplate: config.blockExplorerTxUrlTemplate || ""
  });
});

app.post("/agent/preset", (req, res) => {
  const raw = req.body?.preset;
  if (typeof raw !== "string" || !isValidPreset(raw.toLowerCase())) {
    return res.status(400).json({ error: "preset must be conservative | balanced | aggressive" });
  }
  setRuntimePreset(raw.toLowerCase() as PolicyPresetName);
  return res.json({ preset: getRuntimePreset(), effectivePolicy: getEffectivePolicy() });
});

app.post("/agent/autonomy", (req, res) => {
  const raw = req.body?.mode;
  if (typeof raw !== "string" || !isValidAutonomy(raw.toLowerCase())) {
    return res.status(400).json({ error: "mode must be autonomous | approval" });
  }
  setAutonomyMode(raw.toLowerCase() as AutonomyModeName);
  return res.json({ autonomyMode: getAutonomyMode() });
});

app.get("/governance/pending", (_req, res) => {
  res.json(listPending());
});

app.post("/governance/approve/:id", async (req, res) => {
  try {
    if (isCircuitOpen()) {
      return res.status(503).json({ error: "Circuit breaker is open; close via POST /safety/circuit first." });
    }
    const id = req.params.id;
    const pending = listPending().find((p) => p.id === id);
    if (!pending) {
      return res.status(404).json({ error: "Approval id not found." });
    }
    if (config.dailyUsdtTransferCap > 0) {
      const b = canSpend(pending.decision.amount, config.dailyUsdtTransferCap);
      if (!b.ok) {
        return res.status(429).json({
          error: "Daily USDT transfer cap exceeded",
          cap: config.dailyUsdtTransferCap,
          remaining: b.remaining
        });
      }
    }
    const record = await approvePendingTransfer(id);
    if (!record) {
      return res.status(404).json({ error: "Approval id not found." });
    }
    return res.json(record);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/governance/reject/:id", (req, res) => {
  const ok = rejectPendingTransfer(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: "Approval id not found." });
  }
  return res.json({ rejected: true, id: req.params.id });
});

app.get("/activity", (_req, res) => {
  res.json(getActivityFeed());
});

app.get("/treasury/portfolio", (_req, res) => {
  if (!config.simulationMode) {
    return res.status(400).json({
      error: "Portfolio aggregate view is implemented for simulation in this build; use /wallet/snapshot for live WDK."
    });
  }
  res.json(getPortfolioAggregate(config.wdkWalletId));
});

app.post("/sim/satellite", (req, res) => {
  if (!config.simulationMode) {
    return res.status(400).json({ error: "Simulation only." });
  }
  const id = req.body?.id;
  const balance = Number(req.body?.balance);
  if (typeof id !== "string" || !Number.isFinite(balance) || balance < 0) {
    return res.status(400).json({ error: "body needs { id: string, balance: number }" });
  }
  const ok = setSatelliteBalance(id, balance);
  if (!ok) return res.status(404).json({ error: "Unknown satellite id" });
  return res.json(getPortfolioAggregate(config.wdkWalletId));
});

app.post("/lab/shock", (req, res) => {
  if (!config.simulationMode) {
    return res.status(400).json({ error: "Stress lab is simulation-only in this build." });
  }
  const kind = req.body?.kind;
  const magnitude = Number(req.body?.magnitude);
  if (kind !== "flash_drop" && kind !== "sudden_inflow" && kind !== "drain_small") {
    return res.status(400).json({ error: "kind must be flash_drop | sudden_inflow | drain_small" });
  }
  const result = applySimulationShock(kind, Number.isFinite(magnitude) ? magnitude : NaN);
  return res.json({ ok: true, kind, ...result });
});

app.get("/audit/bundle", (_req, res) => {
  res.json(buildAuditBundle(getFullHistoryForMetrics(), getAutonomyMode()));
});

app.get("/policy/fingerprint", (_req, res) => {
  res.json(buildPolicyFingerprint(getAutonomyMode()));
});

app.get("/safety/status", (_req, res) => {
  res.json({
    circuitOpen: isCircuitOpen(),
    maintenanceFrozen: isMaintenanceFrozen(),
    budget: getBudgetStatus(config.dailyUsdtTransferCap),
    auditSigningConfigured: Boolean(config.auditSigningSecret?.trim()),
    txExplorerTemplateConfigured: Boolean(config.blockExplorerTxUrlTemplate.trim())
  });
});

app.post("/safety/circuit", (req, res) => {
  const open = req.body?.open;
  if (typeof open !== "boolean") {
    return res.status(400).json({ error: "body needs { open: boolean }" });
  }
  setCircuitOpen(open);
  pushActivity(
    "safety",
    "Circuit breaker",
    open ? "OPEN — all outbound WDK transfers blocked" : "CLOSED — transfers allowed per policy"
  );
  res.json({ circuitOpen: isCircuitOpen() });
});

app.post("/insights/explain", async (req, res) => {
  const runId = Number(req.body?.runId);
  if (!Number.isFinite(runId)) {
    return res.status(400).json({ error: "body needs { runId: number }" });
  }
  const record = getHistoryRecordByRunId(runId);
  if (!record) {
    return res.status(404).json({ error: "runId not found in persisted history" });
  }
  if (!config.openaiApiKey?.trim()) {
    return res.status(501).json({
      error: "Set OPENAI_API_KEY (or compatible API) to enable executive explain. Deterministic narrative is already on the record."
    });
  }
  try {
    const explanation = await explainRunForJudges(record);
    return res.json({
      runId,
      deterministicNarrative: record.narrative ?? "",
      llmExecutiveBrief: explanation,
      disclosure: "LLM only paraphrases; all numbers come from the run record."
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Explain failed"
    });
  }
});

app.get("/treasury/health", async (_req, res) => {
  try {
    const snapshot = await getWalletSnapshot();
    const health = buildTreasuryHealth(
      snapshot.usdtBalance,
      getFullHistoryForMetrics(),
      getCooldownRemainingMs(),
      getLastTransferAt()
    );
    res.json(health);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/wallet/snapshot", async (_req, res) => {
  try {
    const snapshot = await getWalletSnapshot();
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/agent/run", async (_req, res) => {
  try {
    const run = await runAgentOnce();
    const explorer =
      run.transfer?.txId && run.transfer.success
        ? explorerUrlForTx(run.transfer.txId)
        : null;
    res.json({ ...run, explorerUrl: explorer });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/agent/preview", async (req, res) => {
  try {
    const raw = req.body?.balance ?? req.body?.usdtBalance;
    const hypothetical =
      raw === undefined || raw === null ? undefined : Number(raw);
    const preview = await runAgentPreview(hypothetical);
    res.json(preview);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/briefing/judge", async (_req, res) => {
  try {
    res.json(await buildJudgeBriefing());
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/utils/tx-link", (req, res) => {
  const txId = String(req.query.txId ?? "");
  const url = explorerUrlForTx(txId);
  if (!url) {
    return res.status(404).json({ error: "No explorer URL for this txId (configure BLOCK_EXPLORER_TX_URL_TEMPLATE)" });
  }
  res.redirect(302, url);
});

app.get("/agent/history", (_req, res) => {
  res.json(getAgentHistory());
});

app.get("/agent/history/export", (req, res) => {
  const format = String(req.query.format ?? "json").toLowerCase();
  const rows = getFullHistoryForMetrics();
  if (format === "csv") {
    const header =
      '"runId","at","beforeBalance","afterBalance","shouldAct","amount","reason","transferOk","txId","deferral","outcome","zScore","narrative200"';
    const body = rows.map(rowToCsv).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="stablepilot-history.csv"');
    return res.send(rows.length ? `${header}\n${body}` : header);
  }
  res.json(rows);
});

app.post("/sim/balance", (req, res) => {
  if (!config.simulationMode) {
    return res.status(400).json({ error: "Only available when SIMULATION_MODE=true." });
  }
  const value = Number(req.body?.balance ?? req.body?.usdtBalance);
  if (!Number.isFinite(value) || value < 0) {
    return res.status(400).json({ error: "balance must be a non-negative number" });
  }
  setSimulatedBalance(value);
  return res.json({ ok: true, usdtBalance: value });
});

app.post("/agent/start", (_req, res) => {
  if (intervalRef) {
    return res.status(400).json({ error: "Agent already running." });
  }

  intervalRef = setInterval(async () => {
    try {
      await runAgentOnce();
    } catch (error) {
      console.error("Agent run failed:", error);
    }
  }, getEffectiveRunIntervalMs());

  pushActivity(
    "loop_start",
    "Agent loop",
    `Started periodic runs (${getEffectiveRunIntervalMs()} ms)`
  );
  return res.json({ started: true });
});

app.post("/agent/stop", (_req, res) => {
  if (intervalRef) {
    clearInterval(intervalRef);
    intervalRef = null;
  }
  pushActivity("loop_stop", "Agent loop", "Stopped periodic runs");
  res.json({ stopped: true });
});

app.get("/api/routes", (_req, res) => {
  res.json({
    service: "StablePilot",
    tagline: "Treasury Governance OS — statistics + policy + optional human approval",
    routes: [
      { method: "GET", path: "/health" },
      { method: "GET", path: "/health/ready" },
      { method: "GET", path: "/version" },
      { method: "GET", path: "/time" },
      { method: "GET", path: "/features" },
      { method: "GET", path: "/metrics", note: "Prometheus text" },
      { method: "GET", path: "/openapi.json" },
      { method: "GET", path: "/limits" },
      { method: "GET", path: "/treasury/summary" },
      { method: "GET", path: "/runtime/interval" },
      { method: "POST", path: "/runtime/interval", body: { ms: "number | clear" } },
      { method: "GET", path: "/maintenance" },
      { method: "POST", path: "/maintenance", body: { frozen: "boolean" } },
      { method: "GET", path: "/insights/analytics" },
      { method: "GET", path: "/insights/zstats" },
      { method: "GET", path: "/report/activity" },
      { method: "GET", path: "/ledger/transfers" },
      { method: "GET", path: "/pipeline/layers" },
      { method: "GET", path: "/governance/stats" },
      { method: "GET", path: "/export/compliance" },
      { method: "GET", path: "/wallet/snapshots/recent" },
      { method: "POST", path: "/agent/run/batch", body: { count: "1–10" } },
      { method: "POST", path: "/agent/preview/compare", body: { balances: "number[]" } },
      { method: "POST", path: "/ops/webhook/test" },
      { method: "POST", path: "/ops/activity/clear", note: "sim or X-Ops-Token" },
      { method: "POST", path: "/safety/budget/reset", note: "sim or X-Ops-Token" },
      { method: "POST", path: "/sim/scenario", body: { scenario: "demo_healthy|demo_stressed|…" } },
      { method: "POST", path: "/utils/echo" },
      { method: "POST", path: "/utils/hash", body: { text: "string" } },
      { method: "GET", path: "/agent/status" },
      { method: "GET", path: "/agent/config" },
      { method: "POST", path: "/agent/preset", body: { preset: "conservative|balanced|aggressive" } },
      { method: "POST", path: "/agent/autonomy", body: { mode: "autonomous|approval" } },
      { method: "GET", path: "/governance/pending" },
      { method: "POST", path: "/governance/approve/:id" },
      { method: "POST", path: "/governance/reject/:id" },
      { method: "GET", path: "/activity" },
      { method: "GET", path: "/treasury/health" },
      { method: "GET", path: "/wallet/snapshot" },
      { method: "POST", path: "/agent/run" },
      { method: "POST", path: "/agent/preview", body: { balance: "optional number — hypothetical USDT balance" } },
      { method: "GET", path: "/briefing/judge", note: "one-screen JSON for demos / judging" },
      { method: "GET", path: "/utils/tx-link?txId=0x…", note: "redirect to block explorer when template set" },
      { method: "GET", path: "/agent/history" },
      { method: "GET", path: "/agent/history/export?format=json|csv" },
      { method: "POST", path: "/sim/balance", note: "simulation only" },
      { method: "GET", path: "/treasury/portfolio", note: "simulation" },
      { method: "POST", path: "/sim/satellite", note: "simulation" },
      { method: "POST", path: "/lab/shock", note: "simulation stress" },
      { method: "POST", path: "/lab/scenario-chain", note: "multi-step sim narrative" },
      { method: "GET", path: "/policy/matrix" },
      { method: "GET", path: "/insights/stability-index", note: "Treasury Stability Index" },
      { method: "GET", path: "/attestation/snapshot" },
      { method: "GET", path: "/innovation/manifest" },
      { method: "GET", path: "/wallet/snapshots/all", note: "primary + optional secondary" },
      { method: "GET", path: "/engage/badges" },
      { method: "GET", path: "/engage/streak" },
      { method: "GET", path: "/insights/risk-radar" },
      { method: "POST", path: "/insights/runway-whatif", body: { burnPerDay: "number" } },
      { method: "GET", path: "/insights/compare-runs?a=&b=" },
      { method: "GET", path: "/policy/diff?from=&to=" },
      { method: "GET", path: "/insights/balance-heatmap" },
      { method: "GET", path: "/webhooks/catalog" },
      { method: "GET", path: "/proof/run/:runId" },
      { method: "GET", path: "/devtools/curl-bundle", note: "text/plain" },
      { method: "GET", path: "/meta/changelog" },
      { method: "GET", path: "/meta/feature-flags" },
      { method: "GET", path: "/meta/request-stats" },
      { method: "POST", path: "/integrations/command", body: { text: "string" } },
      { method: "GET", path: "/goals/treasury" },
      { method: "POST", path: "/goals/treasury" },
      { method: "POST", path: "/governance/preview-impact", body: { amount: "number" } },
      { method: "GET", path: "/public/status" },
      { method: "GET", path: "/insights/trust-score" },
      { method: "GET", path: "/briefing/onepager", note: "markdown" },
      { method: "GET", path: "/sim/presets" },
      { method: "GET", path: "/audit/bundle" },
      { method: "GET", path: "/policy/fingerprint" },
      { method: "GET", path: "/safety/status" },
      { method: "POST", path: "/safety/circuit", body: { open: "boolean" } },
      { method: "GET", path: "/events/stream", note: "SSE activity stream" },
      { method: "POST", path: "/insights/explain", body: { runId: "number" } },
      { method: "POST", path: "/agent/start" },
      { method: "POST", path: "/agent/stop" }
    ]
  });
});

const sseClients = new Set<Response>();

subscribeActivity((item) => {
  const line = `data: ${JSON.stringify(item)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(line);
    } catch {
      sseClients.delete(client);
    }
  }
});

app.get("/events/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  sseClients.add(res);
  res.write(
    `data: ${JSON.stringify({
      at: new Date().toISOString(),
      kind: "safety",
      title: "SSE",
      detail: "stream connected"
    })}\n\n`
  );
  req.on("close", () => sseClients.delete(res));
});

app.listen(config.port, config.host, () => {
  console.log(
    `StablePilot (Galactica agent) on http://${config.host === "0.0.0.0" ? "localhost" : config.host}:${config.port}`
  );
});
