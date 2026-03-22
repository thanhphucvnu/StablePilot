import { getAutonomyMode, getCooldownRemainingMs, getFullHistoryForMetrics, getLastTransferAt, listPending } from "./agent";
import { isCircuitOpen } from "./circuitBreaker";
import { config } from "./config";
import { getWalletSnapshot } from "./integrations/wdkClient";
import { buildTreasuryHealth } from "./health";
import { isMaintenanceFrozen } from "./maintenance";
import { getEffectiveRunIntervalMs } from "./runtimeInterval";

export async function buildJudgeBriefing() {
  const history = getFullHistoryForMetrics();
  const snapshot = await getWalletSnapshot();
  const health = buildTreasuryHealth(
    snapshot.usdtBalance,
    history,
    getCooldownRemainingMs(),
    getLastTransferAt()
  );

  return {
    project: "StablePilot",
    tagline:
      "Treasury Governance OS — reproducible drift statistics, optional human approval, WDK execution, auditable hashes.",
    whyItMattersForJudges: [
      "Clear WDK touchpoints: read balance + execute USDT transfer (see wdkClient.ts).",
      "Decisions are anchored in policy + z-score statistics, not opaque LLM-only vibes.",
      "Enterprise-style controls: approval queue, kill switch, daily spend cap, SSE audit stream.",
      "Exportable integrity: /audit/bundle + optional HMAC; /policy/fingerprint for change control narrative.",
      "Operator surface: /metrics (Prometheus), /openapi.json, /treasury/summary, maintenance freeze, batch runs, compliance export.",
      "Novel metrics: Treasury Stability Index (TSI) at GET /insights/stability-index; policy shadow matrix at GET /policy/matrix; attestation chain at GET /attestation/snapshot.",
      "Engage layer: GET /engage/badges + /engage/streak; Judge trust score GET /insights/trust-score; risk radar GET /insights/risk-radar; public embed GET /public/status; bot router POST /integrations/command."
    ],
    liveTelemetry: {
      simulationMode: config.simulationMode,
      primaryWalletId: snapshot.walletId,
      primaryBalanceUsdt: snapshot.usdtBalance,
      healthScore: health.healthScore,
      healthStatus: health.status,
      runwayHours: health.runwayHours,
      autonomyMode: getAutonomyMode(),
      circuitOpen: isCircuitOpen(),
      maintenanceFrozen: isMaintenanceFrozen(),
      effectiveRunIntervalMs: getEffectiveRunIntervalMs(),
      openApprovalCount: listPending().length,
      governanceStrict: config.governanceStrict,
      dailyCapConfigured: config.dailyUsdtTransferCap > 0
    },
    endpointsForDemo: {
      judgeBriefing: "GET /briefing/judge",
      treasurySummary: "GET /treasury/summary",
      dryRunPreview: "POST /agent/preview { balance?: number }",
      previewCompare: "POST /agent/preview/compare { balances: number[] }",
      prometheusMetrics: "GET /metrics",
      openApi: "GET /openapi.json",
      complianceExport: "GET /export/compliance",
      analytics: "GET /insights/analytics",
      maintenance: "GET|POST /maintenance { frozen?: boolean }",
      auditBundle: "GET /audit/bundle",
      policyFingerprint: "GET /policy/fingerprint",
      sseActivity: "GET /events/stream",
      apiIndex: "GET /api/routes",
      featureList: "GET /features",
      stabilityIndex: "GET /insights/stability-index",
      policyMatrix: "GET /policy/matrix",
      attestationSnapshot: "GET /attestation/snapshot",
      innovationManifest: "GET /innovation/manifest",
      scenarioChain: "POST /lab/scenario-chain",
      dualWallet: "GET /wallet/snapshots/all"
    },
    repositoryMap: {
      wdk: "src/integrations/wdkClient.ts",
      agent: "src/agent.ts",
      pipeline: "src/pipeline.ts",
      statistics: "src/statsEngine.ts",
      safety: "src/circuitBreaker.ts, src/transferBudget.ts"
    }
  };
}
