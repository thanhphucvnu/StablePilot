import { readPackageVersion } from "./versionInfo";

type PathItem = Record<string, { summary: string; tags?: string[] }>;

export function buildOpenApiJson(): {
  openapi: string;
  info: { title: string; version: string; description: string };
  paths: Record<string, PathItem>;
} {
  const paths: Record<string, PathItem> = {
    "/health": { get: { summary: "Liveness and configuration flags", tags: ["Core"] } },
    "/health/ready": { get: { summary: "Readiness with wallet probe", tags: ["Core"] } },
    "/version": { get: { summary: "Package version string", tags: ["Core"] } },
    "/time": { get: { summary: "Server UTC clock", tags: ["Core"] } },
    "/features": { get: { summary: "Human-readable capability list", tags: ["Core"] } },
    "/metrics": { get: { summary: "Prometheus text exposition", tags: ["Observability"] } },
    "/openapi.json": { get: { summary: "This specification", tags: ["Core"] } },
    "/treasury/summary": { get: { summary: "Rollup: wallet + health + safety + governance", tags: ["Treasury"] } },
    "/treasury/health": { get: { summary: "Health score and runway", tags: ["Treasury"] } },
    "/treasury/portfolio": { get: { summary: "Simulated multi-vault aggregate", tags: ["Treasury"] } },
    "/wallet/snapshot": { get: { summary: "Primary wallet USDT snapshot", tags: ["Treasury"] } },
    "/wallet/snapshots/recent": { get: { summary: "Recent snapshot ring buffer", tags: ["Treasury"] } },
    "/agent/status": { get: { summary: "Loop + preset + cooldown", tags: ["Agent"] } },
    "/agent/config": { get: { summary: "Effective policy and governance fields", tags: ["Agent"] } },
    "/agent/history": { get: { summary: "Recent in-memory history window", tags: ["Agent"] } },
    "/agent/history/export": { get: { summary: "Full persisted history JSON or CSV", tags: ["Agent"] } },
    "/agent/run": { post: { summary: "Single autonomous cycle", tags: ["Agent"] } },
    "/agent/run/batch": { post: { summary: "Sequential bounded batch runs", tags: ["Agent"] } },
    "/agent/preview": { post: { summary: "Dry-run governance path", tags: ["Agent"] } },
    "/agent/preview/compare": { post: { summary: "Compare previews for multiple balances", tags: ["Agent"] } },
    "/agent/start": { post: { summary: "Start periodic loop", tags: ["Agent"] } },
    "/agent/stop": { post: { summary: "Stop periodic loop", tags: ["Agent"] } },
    "/runtime/interval": {
      get: { summary: "Effective and override interval", tags: ["Runtime"] },
      post: { summary: "Set interval override ms or clear", tags: ["Runtime"] }
    },
    "/maintenance": {
      get: { summary: "Maintenance freeze flag", tags: ["Safety"] },
      post: { summary: "Set maintenance freeze", tags: ["Safety"] }
    },
    "/governance/pending": { get: { summary: "Queued approvals", tags: ["Governance"] } },
    "/governance/stats": { get: { summary: "Historical governance outcome counters", tags: ["Governance"] } },
    "/governance/approve/{id}": { post: { summary: "Approve pending transfer", tags: ["Governance"] } },
    "/governance/reject/{id}": { post: { summary: "Reject pending item", tags: ["Governance"] } },
    "/insights/analytics": { get: { summary: "Run counts by outcome and windows", tags: ["Insights"] } },
    "/insights/zstats": { get: { summary: "Current z-score snapshot", tags: ["Insights"] } },
    "/insights/explain": { post: { summary: "LLM paraphrase for a run", tags: ["Insights"] } },
    "/report/activity": { get: { summary: "Aggregate activity report", tags: ["Insights"] } },
    "/ledger/transfers": { get: { summary: "Runs that include a transfer object", tags: ["Insights"] } },
    "/pipeline/layers": { get: { summary: "Static pipeline documentation", tags: ["Insights"] } },
    "/export/compliance": { get: { summary: "Audit + fingerprint + summary bundle", tags: ["Compliance"] } },
    "/audit/bundle": { get: { summary: "Deterministic audit hashes", tags: ["Compliance"] } },
    "/policy/fingerprint": { get: { summary: "Policy hash", tags: ["Compliance"] } },
    "/briefing/judge": { get: { summary: "Judge demo JSON", tags: ["Compliance"] } },
    "/safety/status": { get: { summary: "Circuit + budget + flags", tags: ["Safety"] } },
    "/safety/circuit": { post: { summary: "Open or close circuit breaker", tags: ["Safety"] } },
    "/safety/budget/reset": { post: { summary: "Reset daily spend counter", tags: ["Safety"] } },
    "/ops/webhook/test": { post: { summary: "Send test webhook event", tags: ["Ops"] } },
    "/ops/activity/clear": { post: { summary: "Clear in-memory activity feed", tags: ["Ops"] } },
    "/utils/echo": { post: { summary: "Echo JSON body", tags: ["Utils"] } },
    "/utils/hash": { post: { summary: "SHA-256 of text field", tags: ["Utils"] } },
    "/utils/tx-link": { get: { summary: "Redirect to explorer", tags: ["Utils"] } },
    "/sim/balance": { post: { summary: "Set simulated balance", tags: ["Simulation"] } },
    "/sim/scenario": { post: { summary: "Named demo balance preset", tags: ["Simulation"] } },
    "/sim/satellite": { post: { summary: "Set satellite vault balance", tags: ["Simulation"] } },
    "/lab/shock": { post: { summary: "Apply liquidity shock", tags: ["Simulation"] } },
    "/lab/scenario-chain": { post: { summary: "Sequential shocks in one call", tags: ["Simulation"] } },
    "/policy/matrix": { get: { summary: "Effective policy for all presets", tags: ["Governance"] } },
    "/insights/stability-index": { get: { summary: "Treasury Stability Index composite", tags: ["Insights"] } },
    "/attestation/snapshot": { get: { summary: "Attestation root over audit + fingerprint", tags: ["Compliance"] } },
    "/innovation/manifest": { get: { summary: "Differentiator narrative for judges", tags: ["Compliance"] } },
    "/wallet/snapshots/all": { get: { summary: "Primary + optional secondary wallet", tags: ["Treasury"] } },
    "/engage/badges": { get: { summary: "Gamified badges from history", tags: ["Engage"] } },
    "/engage/streak": { get: { summary: "UTC day streak stats", tags: ["Engage"] } },
    "/insights/risk-radar": { get: { summary: "Five-axis radar JSON", tags: ["Insights"] } },
    "/insights/runway-whatif": { post: { summary: "Linear runway to min", tags: ["Insights"] } },
    "/insights/compare-runs": { get: { summary: "Diff two runIds", tags: ["Insights"] } },
    "/policy/diff": { get: { summary: "Numeric delta between presets", tags: ["Governance"] } },
    "/insights/balance-heatmap": { get: { summary: "Hour-of-day balance averages", tags: ["Insights"] } },
    "/webhooks/catalog": { get: { summary: "Outbound event types", tags: ["Ops"] } },
    "/proof/run/{runId}": { get: { summary: "SHA-256 proof of run", tags: ["Compliance"] } },
    "/devtools/curl-bundle": { get: { summary: "Shell snippet pack", tags: ["DevTools"] } },
    "/meta/changelog": { get: { summary: "Release highlights", tags: ["Meta"] } },
    "/meta/feature-flags": { get: { summary: "Boolean capability flags", tags: ["Meta"] } },
    "/meta/request-stats": { get: { summary: "In-memory request counts", tags: ["Meta"] } },
    "/integrations/command": { post: { summary: "Bot-style command router", tags: ["Integrations"] } },
    "/goals/treasury": {
      get: { summary: "Optional treasury goal + progress", tags: ["Engage"] },
      post: { summary: "Set/clear goal", tags: ["Engage"] }
    },
    "/governance/preview-impact": { post: { summary: "Dry-run gate check for amount", tags: ["Governance"] } },
    "/public/status": { get: { summary: "Embed-friendly minimal JSON", tags: ["Public"] } },
    "/insights/trust-score": { get: { summary: "Judge trust composite", tags: ["Insights"] } },
    "/briefing/onepager": { get: { summary: "Markdown executive one-pager", tags: ["Compliance"] } },
    "/sim/presets": { get: { summary: "List named sim scenarios", tags: ["Simulation"] } },
    "/activity": { get: { summary: "Recent ops activity", tags: ["Stream"] } },
    "/events/stream": { get: { summary: "SSE stream", tags: ["Stream"] } },
    "/api/routes": { get: { summary: "Route index JSON", tags: ["Core"] } },
    "/limits": { get: { summary: "Configured numeric limits", tags: ["Core"] } }
  };
  return {
    openapi: "3.0.3",
    info: {
      title: "StablePilot API",
      version: readPackageVersion(),
      description: "Treasury Governance OS — HTTP API for WDK-backed agent operations."
    },
    paths
  };
}
