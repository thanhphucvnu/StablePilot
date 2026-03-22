# Third-Party Disclosure — StablePilot

**Project:** StablePilot (Galactica / WDK hackathon submission)  
**Purpose:** Satisfy hackathon disclosure requirements for external services, libraries, and optional AI.

---

## External Services / APIs

| Service | How it is used |
|---------|----------------|
| **WDK Wallet API** (configured via `WDK_API_BASE_URL`) | Read USDT balance; execute USDT transfer. Core mandatory integration. |
| **Block explorer (optional)** | User-configured URL template for linking on-chain tx hashes from the dashboard. No data sent to explorer except redirect/follow. |
| **OpenAI-compatible API (optional)** | `OPENAI_API_KEY` + `OPENAI_BASE_URL` for `POST /insights/explain` — executive paraphrase of an existing run record only; no new numeric facts invented by design. |
| **Google Fonts CDN** | Loads DM Sans, JetBrains Mono, Syne for the static dashboard (`fonts.googleapis.com`, `fonts.gstatic.com`). |

---

## Open-Source Libraries / Frameworks

| Name | Version (see `package.json`) | Purpose |
|------|------------------------------|---------|
| **express** | ^4.19.x | HTTP server, API routes, static file hosting. |
| **dotenv** | ^16.4.x | Load environment variables from `.env`. |
| **typescript** | ^5.7.x | Type-safe source; compiles to JavaScript. |
| **tsx** | ^4.19.x (dev) | Run TypeScript in development (`npm run dev`). |
| **@types/express**, **@types/node** | (dev) | Type definitions. |

No paid UI component libraries; dashboard is hand-written HTML/CSS/JS.

---

## AI Models / Providers

| Provider | Purpose |
|----------|---------|
| **None required** | Core product uses deterministic policy, statistics, and narratives. |
| **Optional:** OpenAI or any OpenAI-compatible endpoint | `gpt-4o-mini` (default) or `EXPLAIN_MODEL` for optional text paraphrase in `/insights/explain`. |

---

## Prebuilt Components / Forked Codebases

- **No forked third-party treasury product.** The implementation is original to this team for the hackathon, built on standard Node/Express patterns and hackathon-specific governance logic.

---

## Data Sources

- **Wallet balances:** WDK API responses (or in-memory simulation).
- **Run history:** Locally persisted JSON under `data/` (created at runtime).
- **No end-user PII** is collected by the default server.

---

## Security / Privacy Notes

- Secrets (`WDK_API_KEY`, `OPENAI_API_KEY`, `AUDIT_SIGNING_SECRET`, `WEBHOOK_HMAC_SECRET`, `OPS_TOKEN`) must be supplied via environment variables, not committed to the repository.
- Optional `OPS_TOKEN` + header `X-Ops-Token` protect sensitive demo endpoints in non-simulation deployments.
- Webhook HMAC (`WEBHOOK_HMAC_SECRET`) signs outbound POST bodies with header `X-StablePilot-Signature`.

---

## Original Work Statement

All critical implementation for **StablePilot**, including the four-layer governance pipeline, WDK integration wrapper, agent orchestration, persistence, audit hashing, safety modules, dashboard UI, and the extended HTTP API surface documented in `GET /api/routes`, was developed by our team for this hackathon. Dependencies are limited to those listed above and standard tooling (Node.js, npm).
