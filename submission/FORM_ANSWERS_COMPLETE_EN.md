# DoraHacks / Galactica WDK — Submission Answers (English, Complete)

**Use this file as the single copy-paste source for the DoraHacks project form.**  
Replace every `[PLACEHOLDER]` before submitting.

---

## Project Name

**StablePilot**

---

## One-Line Tagline

**Treasury Governance OS:** WDK-backed USDT treasury automation with a reproducible four-layer pipeline (rules → drift statistics → narrative → execution), optional human approval, circuit breaker, daily caps, full audit exports, and 80+ HTTP APIs — not opaque “LLM-only” treasury agents.

---

## Short Description (2–4 sentences)

StablePilot is an operations-grade treasury agent that monitors USDT liquidity and executes bounded transfers through the Wallet Development Kit (WDK). Decisions flow through policy thresholds, reproducible z-score statistics on balance deltas (industrial SPC-style drift detection), a deterministic narrative layer, and an execution gate that supports fully autonomous runs or semi-autonomous approval queues. The stack includes a live dashboard, Server-Sent Events activity stream, Prometheus metrics, OpenAPI, compliance exports, and simulation tools so judges and operators can verify behavior without trusting a black-box model.

---

## Problem

Crypto treasuries, DAOs, and payment ops teams often rely on manual balance checks and ad hoc transfers. That creates delays, human error, and liquidity shortfalls that break payroll, vendor flows, and protocol operations. Pure “AI chat” agents lack reproducible math and audit trails, so risk and compliance teams cannot sign off. Teams need **governed autonomy**: clear policy, statistical guardrails, optional human gates, and provable logs tied to real wallet actions via WDK.

---

## Solution

StablePilot runs a closed loop: read balance (WDK or simulation) → compute drift statistics → evaluate effective policy (with runtime presets) → run a four-layer governance pipeline → either queue a transfer for human approval or execute within cooldown, daily USDT cap, and circuit breaker. Every cycle is persisted, exportable (JSON/CSV), and hashable for audit demos. A web dashboard exposes health, runway, governance controls, stress lab, judge briefing JSON, and a “Playbook” tab for badges, trust scores, risk radar, and proof-of-run hashes. OpenClaw-compatible tool shapes are provided for agent frameworks.

---

## Track

**AI Agent + WDK Wallet Integration**  
*(Adjust if your hackathon lists a different exact track name.)*

---

## Demo Video URL (≤ 5 min)

`[PASTE_PUBLIC_VIDEO_URL — YouTube, Loom, Google Drive “anyone with link”, etc.]`

---

## Repository URL

https://github.com/thanhphucvnu/StablePilot

---

## Live Product URL (if deployed)

`[PASTE_YOUR_RENDER_OR_PRODUCTION_HTTPS_URL]`  
Example: `https://stablepilot.onrender.com` (replace with your actual Render hostname). Judges: append `/health` to verify the instance is up (free tier may cold-start ~30–60s).

---

## Technical Overview

- **Runtime:** Node.js 20+, TypeScript, Express (`galactica-agent/`).
- **Core orchestration:** `src/agent.ts` — autonomy modes, cooldown, approvals, webhooks, persisted history.
- **Policy & statistics:** `src/policy.ts`, `src/statsEngine.ts` (z-score on balance flow), `src/pipeline.ts`, `src/narrative.ts`.
- **WDK:** `src/integrations/wdkClient.ts` — HTTP `GET /wallets/{id}/balances`, `POST /wallets/{id}/transfer` (USDT); `SIMULATION_MODE=true` for judge-safe demos without live keys.
- **Persistence:** `data/agent-history.json`, `data/pending-approvals.json`, optional budget/circuit state files.
- **Safety:** `src/circuitBreaker.ts`, `src/transferBudget.ts`, `src/maintenance.ts` (freeze execution while still evaluating policy).
- **Observability:** `GET /metrics` (Prometheus), `GET /events/stream` (SSE), `GET /openapi.json`, `X-Request-Id` on responses.
- **Compliance narrative:** `GET /audit/bundle`, `GET /policy/fingerprint`, `GET /attestation/snapshot`, `GET /export/compliance`, `GET /briefing/judge`, `GET /briefing/onepager` (Markdown).
- **UI:** `public/index.html` — hero landing, tabbed command center, `public/judge-pack.html` print view.
- **Scale:** **80+ routes** listed in `GET /api/routes`; feature list in `GET /features` and `GET /innovation/manifest`.

---

## WDK Integration (Mandatory)

| Area | Implementation |
|------|----------------|
| **Read balances** | `getWalletSnapshot()` → `GET {WDK_API_BASE_URL}/wallets/{WDK_WALLET_ID}/balances` with Bearer key. |
| **Execute transfers** | `transferUsdtToTreasury(amount)` → `POST .../transfer` with JSON body (`asset: USDT`, `amount`, `direction: IN`). |
| **Agent ↔ wallet** | Every autonomous or approved path that passes gates can result in a real WDK transfer; simulation mode swaps in in-memory balance + `sim_*` tx ids for demos. |
| **Why non-superficial** | The agent does not merely “display” a wallet: it **decides** under policy + statistics, **records** outcomes, and **calls** WDK for the actual movement of funds. Integration is isolated in `wdkClient.ts` so official WDK SDKs can replace HTTP without rewriting governance logic. |

**Code pointers:** `src/integrations/wdkClient.ts`, `src/agent.ts`, `src/pendingApprovals.ts`.

---

## Agent Autonomy

- **Default:** `AUTONOMY_MODE=autonomous` — periodic or manual `POST /agent/run` can trigger transfers when policy + pipeline allow.
- **Semi-autonomous:** `AUTONOMY_MODE=approval` — proposals enqueue to `data/pending-approvals.json`; humans `POST /governance/approve/:id` or reject.
- **Governance strict:** Optional `GOVERNANCE_STRICT` blocks execution when \|z\| exceeds `GOVERNANCE_Z_THRESHOLD` even if policy would act.
- **Global kill switch:** Circuit breaker blocks all outbound transfers.
- **Budget:** Rolling UTC daily cap on outbound USDT when configured.

---

## Correctness & Reliability

- Strict TypeScript types for runs, decisions, and transfers.
- Deterministic statistics and hashing for audit bundles (same inputs → same hashes).
- Cooldown and daily cap reduce accidental rapid or oversized outflows.
- Error handling on WDK HTTP failures; failed transfers recorded with outcomes.
- `GET /health/ready` probes wallet readability for readiness checks.
- Dry-run APIs: `POST /agent/preview`, `POST /agent/preview/compare`, `POST /governance/preview-impact` for safe demos.

---

## Economic Soundness

- Transfers only when policy says action is needed; amounts capped by `maxTxAmount` (effective per preset).
- Cooldown reduces fee burn and operational noise from thrashing.
- Daily cap bounds worst-case daily outflow in autonomous + approved paths.
- Simulation and stress lab allow repeatable demos without spending real gas or treasury budget.

---

## Real-World Applicability

**Primary users:** DAO treasurers, fintech ops, stablecoin treasury desks, protocols with hot wallets, hackathon teams needing a credible “governance agent” story.

**Deployment scenario:** Configure WDK credentials and policy env vars; run API behind VPN or internal network; expose dashboard to operators; wire `WEBHOOK_URL` to Slack/PagerDuty-style consumers; optional `WEBHOOK_HMAC_SECRET` for signature verification.

---

## Third-Party Services / APIs / Components

See **`submission/THIRD_PARTY_DISCLOSURE_STABLEPILOT.md`** for the full table. Summary:

- **Express** — HTTP API.
- **dotenv** — configuration.
- **TypeScript / tsx** — build and dev.
- **WDK HTTP API** — balance + transfer (mandatory integration surface).
- **Optional:** OpenAI-compatible API for `POST /insights/explain` (paraphrase only; no invented numbers).
- **Google Fonts** (DM Sans, JetBrains Mono, Syne) — dashboard typography via CDN.

---

## Setup / Run Instructions

1. Install **Node.js 20+**.
2. `cd galactica-agent && npm install`
3. Copy `config.example.txt` to `.env` (or export vars). For judges without WDK keys: keep `SIMULATION_MODE=true`.
4. `npm run dev` — server defaults to `http://localhost:8080`
5. Open the dashboard in a browser; use **Run once** or `POST /agent/run`.
6. Optional: `npm run seed:demo` for sample history.
7. Production-style run: set `SIMULATION_MODE=false`, `WDK_API_BASE_URL`, `WDK_API_KEY`, `WDK_WALLET_ID`.

---

## Team Location

`[CITY, COUNTRY]`

---

## Team Members

- `[FULL_NAME]` — `[ROLE, e.g. Lead / Full-stack]` — `[1-line background]`
- `[FULL_NAME]` — `[ROLE]` — `[1-line background]`  
*(Add or remove rows.)*

---

## What Was Built During the Hackathon

The StablePilot **Treasury Governance OS** in this repository: WDK client wrapper, four-layer pipeline, policy presets, approval queue with persistence, treasury health + runway, audit bundle + fingerprint + attestation chain, circuit breaker + daily budget, SSE + webhooks (optional HMAC), Prometheus + OpenAPI, judge briefing and one-pager, stability/trust scores, risk radar, engage badges and streaks, simulation stress lab + scenario chain + 13+ named presets, dual-wallet snapshot option, dashboard (hero + tabs + Playbook), and 80+ documented HTTP endpoints — all scoped to **governed treasury automation** rather than unrelated DeFi verticals.

---

## Future Roadmap

- Native WDK SDK adapter alongside current HTTP adapter; multi-asset policies.
- Deeper forecasting (confidence bands) and policy DSL for non-developer operators.
- Out-of-the-box Slack/Discord/Telegram connectors using existing webhook + signed payloads.
- Optional read replicas and external log shipping for enterprise audit.

---

## Optional: Elevator Pitch (30 seconds, spoken)

“StablePilot is a treasury agent that doesn’t guess — it measures. It reads your USDT balance through WDK, runs reproducible drift statistics like factory quality control, then either executes a bounded transfer or asks a human to approve. Every step is logged, hashed, and exportable. It’s autonomy with receipts — built for judges who care about math, auditability, and real wallet integration.”
