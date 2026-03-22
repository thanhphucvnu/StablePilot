# StablePilot - Autonomous USDT Treasury Guard

StablePilot is a **Treasury Governance OS**: same wallet automation as other submissions, but with a **reproducible 4-layer pipeline** (rules → drift statistics → council narrative → execution), **optional human approval** before WDK transfer, **runway forecasting**, and full audit exports — closer to enterprise controls (SigmaGuard-style statistics + Intend-style semi-autonomy) than a single opaque “AI said so”.

## Why this is a good DoraHacks submission idea

- Clear real-world problem: treasury wallets can fall below safe liquidity thresholds
- Agent autonomy: policy-based, periodic decision making without manual intervention
- WDK integration: wallet balance read + transfer execution through WDK API endpoints
- **Differentiation**: z-score on balance **flow** (auditable math, not LLM vibes), strict governance mode, approval queue, activity stream, runway estimate
- **Operational depth**: presets, cooldown, webhooks, persisted history + pending queue files, health score, CSV export
- **OpenClaw-friendly**: see `openclaw-tools.example.json` for HTTP tool shapes
- Easy demo in under 5 minutes

## Core flow

1. Read wallet USDT balance from WDK (or simulation)
2. Compute **balance-flow statistics** (mean / σ of deltas, z-score of latest drift)
3. Apply **effective policy** (base `.env` × **preset**)
4. Run **4-layer governance pipeline**; optional **GOVERNANCE_STRICT** blocks WDK if \|z\| is extreme
5. If **AUTONOMY_MODE=approval**, queue transfer in `data/pending-approvals.json` until **POST /governance/approve/:id**
6. Else respect **cooldown**, execute WDK transfer (or simulation), append **persisted** history + **webhooks**

## Project structure

- `src/server.ts` - API, static dashboard, governance + activity routes
- `src/agent.ts` - orchestration, autonomy modes, approvals, cooldown, webhooks
- `src/policy.ts` - threshold decision engine
- `src/pipeline.ts` - governance layer composition
- `src/statsEngine.ts` - z-score / anomaly flag on balance deltas
- `src/narrative.ts` - deterministic “council” narrative for judges (no paid LLM required)
- `src/forecast.ts` - runway-to-min estimate from historical drain
- `src/pendingApprovals.ts` - persisted approval queue
- `src/activityLog.ts` - in-memory ops stream for dashboard
- `src/runtimePreset.ts` - conservative / balanced / aggressive multipliers
- `src/health.ts` - treasury health score + runway
- `src/historyStore.ts` - `data/agent-history.json`
- `src/webhook.ts` - optional outbound JSON hooks
- `src/integrations/wdkClient.ts` - WDK integration wrapper
- `src/types.ts` - shared types
- `public/` - dashboard UI
- `openclaw-tools.example.json` - tool stubs for agent frameworks
- `src/portfolioSim.ts` - multi-vault aggregate (simulation) for org-wide liquidity storytelling
- `src/stressLab.ts` - scripted liquidity shocks for repeatable video demos
- `src/auditBundle.ts` - deterministic SHA-256 audit package over run history + policy snapshot
- `src/llmExplain.ts` - optional OpenAI-compatible paraphrase (facts-only; no new numbers)
- `src/circuitBreaker.ts` - persisted kill switch; blocks all outbound WDK transfers when open
- `src/transferBudget.ts` - rolling UTC daily USDT spend cap (`DAILY_USDT_TRANSFER_CAP`)
- `src/policyFingerprint.ts` - single SHA-256 over effective guardrails for compliance storytelling
- `src/previewRun.ts` - `POST /agent/preview` dry-run (same math, no persistence / WDK transfer)
- `src/judgeBriefing.ts` - `GET /briefing/judge` one-screen JSON for pitch / judging
- `src/explorerLink.ts` - block explorer URLs when `BLOCK_EXPLORER_TX_URL_TEMPLATE` is set
- `src/metricsText.ts` - Prometheus exposition
- `src/treasurySummary.ts` - `GET /treasury/summary` rollup
- `src/runtimeInterval.ts` - bounded loop interval override
- `src/maintenance.ts` - maintenance freeze (evaluate, skip execution)
- `src/insightsAnalytics.ts` - run analytics + activity report + transfer ledger helpers
- `src/openApiSpec.ts` - `GET /openapi.json`
- `src/complianceExport.ts` - `GET /export/compliance`
- `src/pipelineDoc.ts` - `GET /pipeline/layers`
- `src/featureCatalog.ts` - `GET /features`
- `src/governanceStats.ts` - `GET /governance/stats`
- `src/versionInfo.ts` - package version for `/version`
- `src/stabilityIndex.ts` - Treasury Stability Index (TSI) composite score
- `src/attestationSnapshot.ts` - attestation root over fingerprint + audit hashes
- `src/innovationManifest.ts` - judge-facing differentiator manifest
- **SSE** - `GET /events/stream` pushes every activity row in real time (dashboard subscribes)
- **HMAC audit** - set `AUDIT_SIGNING_SECRET` to add `attestationHmac` on `GET /audit/bundle`

## Quick start

1. Install dependencies:
   - `npm install`
2. Copy `config.example.txt` into your local env file and set values.
3. Run development server:
   - `npm run dev`
4. Optional demo run:
   - `npm run seed:demo`

## API endpoints

- `GET /health` - service status (simulation, cooldown, webhook, **autonomy**, **governance strict / z threshold**)
- `GET /agent/status` - loop status, preset, cooldown, autonomy, **open approval count**
- `GET /agent/config` - base + **effective** policy, preset, cooldown, governance fields
- `POST /agent/preset` - body `{ "preset": "conservative"|"balanced"|"aggressive" }`
- `POST /agent/autonomy` - body `{ "mode": "autonomous"|"approval" }`
- `GET /governance/pending` - pending WDK actions awaiting approval
- `POST /governance/approve/:id` / `POST /governance/reject/:id` - human gate
- `GET /activity` - recent ops stream (proposals, transfers, loop events)
- `GET /treasury/health` - health score, status, distances, 24h runs, **runwayHours** estimate
- `GET /wallet/snapshot` - current wallet snapshot
- `POST /agent/run` - run one autonomous cycle (response includes `explorerUrl` when a real tx hash is returned and explorer template is configured)
- `POST /agent/preview` - optional body `{ "balance": number }` — hypothetical governance path, no side effects
- `GET /briefing/judge` - structured “judge pack” JSON (endpoints, repo map, live telemetry)
- `GET /utils/tx-link?txId=0x…` - HTTP redirect to explorer when template is set
- `GET /agent/history` - recent run history (in-memory window for UI)
- `GET /agent/history/export?format=json|csv` - full persisted trail
- `POST /sim/balance` - **simulation only**: body `{ "balance": number }` for instant demos
- `GET /api/routes` - machine-readable route index
- `GET /treasury/portfolio` - **simulation**: primary + satellite vaults + aggregate USDT
- `POST /sim/satellite` - **simulation**: `{ "id", "balance" }` adjust a satellite vault
- `POST /lab/shock` - **simulation**: `{ "kind": "flash_drop"|"sudden_inflow"|"drain_small", "magnitude" }`
- `GET /audit/bundle` - SHA-256 over canonical history tail + policy snapshot hash
- `POST /insights/explain` - `{ "runId" }` optional LLM executive brief (requires `OPENAI_API_KEY`)
- `GET /policy/fingerprint` - SHA-256 fingerprint of active policy + autonomy + caps
- `GET /safety/status` - circuit state, daily budget, signing flag
- `POST /safety/circuit` - body `{ "open": boolean }` kill switch
- `GET /events/stream` - **Server-Sent Events** live activity feed
- `POST /agent/start` - start periodic loop
- `POST /agent/stop` - stop periodic loop

**Extended API (observability, ops, analytics):** `GET /health/ready`, `GET /version`, `GET /time`, `GET /features`, `GET /metrics` (Prometheus text), `GET /openapi.json`, `GET /limits`, `GET /treasury/summary`, `GET|POST /runtime/interval`, `GET|POST /maintenance`, `GET /insights/analytics`, `GET /insights/zstats`, `GET /report/activity`, `GET /ledger/transfers`, `GET /pipeline/layers`, `GET /governance/stats`, `GET /export/compliance`, `GET /wallet/snapshots/recent`, `POST /agent/run/batch`, `POST /agent/preview/compare`, `POST /ops/webhook/test`, `POST /ops/activity/clear`, `POST /safety/budget/reset` (last two: simulation mode or `OPS_TOKEN` + `X-Ops-Token`), `POST /sim/scenario`, `POST /utils/echo`, `POST /utils/hash`. Optional `ENABLE_CORS` + `CORS_ORIGIN` for cross-origin clients; responses include `X-Request-Id`.

**Breakthrough / scale:** `GET /insights/stability-index` (Treasury Stability Index), `GET /policy/matrix` (all presets vs same `.env`), `GET /attestation/snapshot` (root hash + optional HMAC), `GET /innovation/manifest`, `POST /lab/scenario-chain` (multi-shock script), `GET /wallet/snapshots/all` (primary + optional `WDK_SECONDARY_WALLET_ID`). Webhooks: set `WEBHOOK_HMAC_SECRET` for `X-StablePilot-Signature` on outbound POSTs.

**Playbook / growth surface (80+ routes total):** `GET /engage/badges`, `GET /engage/streak`, `GET /insights/risk-radar`, `GET /insights/trust-score`, `POST /insights/runway-whatif`, `GET /insights/compare-runs`, `GET /insights/balance-heatmap`, `GET /policy/diff`, `GET /proof/run/:runId`, `GET /webhooks/catalog`, `GET /devtools/curl-bundle`, `GET /meta/changelog`, `GET /meta/feature-flags`, `GET /meta/request-stats`, `POST /integrations/command`, `GET|POST /goals/treasury`, `POST /governance/preview-impact`, `GET /public/status`, `GET /briefing/onepager`, `GET /sim/presets` (13+ named sim balances). Dashboard **Playbook** tab wires many of these for live demos.

## Web dashboard

A lightweight dashboard is included at `public/index.html` and served by Express. **`public/judge-pack.html`** is a print-friendly view of `GET /briefing/judge`.

1. Start server:
   - `npm run dev`
2. Open browser:
   - `http://localhost:8080`
3. Use dashboard actions:
   - **Tabs**: Overview · Policy & labs · Governance · Safety · **Judge pack** · **Insights & ops** · **Playbook** (badges, trust, radar, goals, compare runs, bot commands, proof-of-run) · Runs & log
   - **Treasury health** + **runway** estimate
   - **Governance**: toggle **Autonomous** vs **Approval required**; watch **strict z-gate** status
   - **Pending WDK actions**: approve/reject queued transfers (approval mode)
   - **Ops stream**: live activity feed (like top submissions’ judge-facing logs)
   - **Policy presets** + **sim balance** + run / loop + **CSV export**; **block explorer** links in history when `BLOCK_EXPLORER_TX_URL_TEMPLATE` is set

## WDK integration notes

This starter uses HTTP requests to represent WDK wallet operations:

- `GET /wallets/{walletId}/balances`
- `POST /wallets/{walletId}/transfer`

If your WDK setup uses a specific SDK package, replace the functions inside `src/integrations/wdkClient.ts` with official SDK calls while keeping the same interface.

## Demo script (for video)

1. Explain **4-layer pipeline** + why z-score is reproducible (contrast with pure-LLM agents)
2. Simulation: drop balance below min → **Run once** in **autonomous** mode → transfer + history row
3. Switch to **approval** mode → run again → show **pending** + **Ops stream** → **Approve** → second history row with tx
4. Toggle **GOVERNANCE_STRICT=true** (env) after wild balance swings → show **statistics_blocked** outcome
5. Show **CSV export** + `wdkClient.ts` mapping to real WDK

## Submission checklist mapping

- Product name + description: ready in this README
- Repo link: publish this folder to GitHub
- Demo video: record endpoint flow (<= 5 min)
- Technical architecture: included above
- WDK integration proof: `src/integrations/wdkClient.ts`
- Third-party disclosure: list dependencies from `package.json` plus WDK API and any optional OpenAI-compatible endpoint on your hackathon form
