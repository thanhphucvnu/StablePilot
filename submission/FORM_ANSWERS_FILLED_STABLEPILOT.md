# DoraHacks Form Answers (Draft) — StablePilot

**Canonical English pack (copy-paste + disclosure + video script):** use **`FORM_ANSWERS_COMPLETE_EN.md`** together with **`THIRD_PARTY_DISCLOSURE_STABLEPILOT.md`**, **`DEMO_VIDEO_SCRIPT_STABLEPILOT_EN.md`**, and **`JUDGE_QUICK_REFERENCE_EN.md`**.

## Project Name
StablePilot

## One-Line Tagline
Treasury Governance OS: WDK treasury automation with a reproducible statistics + policy pipeline, optional human approval, and full audit exports — not “LLM vibes.”

## Short Description
StablePilot is a treasury operations agent that monitors USDT liquidity and executes bounded WDK transfers behind a four-layer governance pipeline (rules → drift z-score statistics → deterministic council narrative → execution). It supports autonomous execution or an approval queue (semi-autonomous), strict statistical blocking, runway forecasting, webhooks, persisted history, and a judge-friendly dashboard with an activity stream.

## Practical value (for your team / ops)
- **Lower operational risk:** automated USDT monitoring, health/runway signals, per-tx limits + cooldown — reduces mistaken or rushed top-ups.
- **Enterprise-style control:** enable **approval** before WDK moves funds; fits DAOs and finance teams that need a human stamp.
- **Auditable for judges / auditors:** four-layer pipeline + z-scores are **reproducible** (same inputs → same outputs), CSV/JSON exports + **audit hash bundle** (`/audit/bundle`), not “vibes-only AI.”
- **Demo-friendly:** stress lab (liquidity shocks) + multi-vault portfolio view + optional LLM that **only paraphrases** existing numbers.

## Differentiation vs typical BUIDL entries
Many teams lean on **lending / escrow / marketplaces**. StablePilot focuses on **treasury and risk governance**: **SPC-style statistics** + **policy** + **human-in-the-loop** + **hashable audit** + **stress lab** — a clear story: *governed autonomy with numbers and logs.*

## Problem
Crypto teams and communities often manage treasury wallets manually, which creates delays, mistakes, and liquidity risk. If balances drop below operational needs, payments and workflows can fail. Manual monitoring is not scalable and is error-prone.

## Solution
StablePilot runs a governance-grade loop: (1) read balance via WDK or simulation, (2) compute reproducible drift statistics (z-score on balance deltas — same family of methods as industrial anomaly detection), (3) evaluate policy thresholds with live presets, (4) run a four-layer pipeline, (5) either queue a WDK transfer for human approval or execute autonomously within cooldown and caps, (6) persist audit rows + CSV export + optional webhooks. This mirrors what strong hackathon submissions emphasize (multi-layer controls, on-chain or WDK execution, transparent logs) while staying focused on treasury liquidity — a crowded but critical niche.

## Track
AI Agent + WDK Wallet Integration

## Demo Video URL
[PASTE_PUBLIC_VIDEO_URL]

## Repository URL
[PASTE_PUBLIC_REPO_URL]

## Live Product URL
N/A (backend API demo)

## Technical Overview
- Backend: Node.js + TypeScript + Express
- **Four-layer pipeline**: rules (policy) → statistics (z-score / σ on balance flow) → council (deterministic narrative) → execution (autonomous or approval-gated)
- **Semi-autonomous mode**: `AUTONOMY_MODE=approval` + `GET/POST /governance/*` + persisted `data/pending-approvals.json`
- **Strict governance**: optional block on extreme \|z\| (`GOVERNANCE_STRICT`, `GOVERNANCE_Z_THRESHOLD`) — auditable, reproducible
- Decision engine: threshold-based policy + preset multipliers (conservative / balanced / aggressive)
- **Transfer cooldown** + deferral rows; **runway** forecasting from historical drain
- **Treasury health API** + **activity feed** (`/activity`) for demo storytelling
- Wallet: WDK HTTP wrapper + simulation mode; `openclaw-tools.example.json` for agent-framework integration
- **Persistence**: `data/agent-history.json`, exports, webhooks (`approval_required`, `approval_rejected`, transfers, blocks)
- Dashboard: governance controls, pending approvals, ops stream, health/runway, presets, sim balance, exports
- **Multi-vault portfolio (sim):** `GET /treasury/portfolio` — illustrative multi-wallet overview + aggregate USDT
- **Stress lab (sim):** `POST /lab/shock` — flash drop / inflow / drain for video-friendly pipeline reactions
- **Audit bundle:** `GET /audit/bundle` — SHA-256 over canonical run slice + effective policy fingerprint
- **Executive explain (optional):** `POST /insights/explain` + OpenAI-compatible API — LLM **only** paraphrases the record, no invented figures

## WDK Integration (Mandatory)
- Reads wallet balances from WDK-connected wallet endpoint
- Executes USDT transfer action through WDK-connected transfer endpoint
- Agent and wallet interaction is direct and meaningful: every autonomous decision can trigger real wallet action
- Integration is modular via `wdkClient` so production SDK/API can be swapped in without changing policy layer

## Agent Autonomy
Default mode runs without human prompts. Operators can switch to **approval** mode so WDK transfers require explicit approval (dashboard or API), matching enterprise controls. Statistical strict mode can veto execution even when policy would act — autonomy is **governed**, not blind.

## Correctness & Reliability
- Strict TypeScript types for decision and transfer records
- Controlled policy boundaries to prevent over-transfer
- Cooldown guardrail against rapid repeated transfers
- Error handling for wallet API failures
- Auditable persisted history + CSV export for post-run verification

## Economic Soundness
The strategy minimizes unnecessary transactions by only acting below threshold and capping transfer size. This keeps operational costs predictable and avoids over-allocation of treasury assets.

## Real-World Applicability
The solution is useful for DAOs, fintech teams, payment ops, and any organization managing stablecoin liquidity. It can be extended to multiple wallets, assets, and dynamic policies.

## Third-Party Services / APIs / Components
- Express: API service framework
- dotenv: environment management
- TypeScript: type-safe runtime logic
- WDK wallet APIs/SDK: wallet balance and transfer operations
- Optional: OpenAI or compatible LLM API (`OPENAI_API_KEY`, `OPENAI_BASE_URL`) for executive explain only

## Setup / Run Instructions
1. Install Node.js 20+
2. `npm install`
3. Configure environment values based on `config.example.txt`
4. Run: `npm run dev`
5. Trigger one cycle: `POST /agent/run`
6. Review history: `GET /agent/history`

## Team Location
[CITY, COUNTRY]

## Team Members
- [NAME] - [ROLE] - [BACKGROUND]

## What Was Built During Hackathon
The autonomous policy engine, WDK wallet integration wrapper, API service, persisted audit trail, treasury health metrics, policy presets, cooldown + webhook hooks, export endpoints, and operator dashboard were built during the hackathon window.

## Future Roadmap
- Multi-wallet and multi-asset policy engine
- Deeper risk scoring (volatility, flow forecasts)
- Slack / PagerDuty connectors on top of webhook payloads
