# StablePilot — Demo Video Script (≤ 5 minutes)

**Audience:** DoraHacks / Galactica WDK judges  
**Tone:** Clear, confident, evidence-based (show API + UI + code pointer)

---

## 0:00 – 0:25 | Hook + Problem

“Hi, we’re **[TEAM_NAME]** from **[LOCATION]**. Treasury teams still babysit stablecoin wallets manually — that’s slow, error-prone, and impossible to audit when someone asks *why* a transfer happened. LLM-only agents don’t cut it for finance: you need **reproducible math** and **wallet-grade execution**.  
We built **StablePilot**: a Treasury Governance OS on top of **WDK** — autonomy with receipts.”

---

## 0:25 – 1:05 | Solution Overview

“StablePilot reads **USDT balance** through WDK, runs a **four-layer pipeline** — rules, **z-score drift statistics** on balance changes, a deterministic narrative, and an execution gate.  
It can run **fully autonomous** or **approval-first** like enterprise payment controls.  
We ship a **live dashboard**, **80+ HTTP endpoints**, **audit hashes**, **Prometheus metrics**, and a **judge pack** JSON so nothing is hand-wavy.”

*(Optional on-screen: logo + `/briefing/judge` JSON snippet.)*

---

## 1:05 – 3:15 | Live Demo (screen recording)

**Environment:** `npm run dev`, browser at `http://localhost:8080`, `SIMULATION_MODE=true` unless you have safe WDK keys.

1. **Hero + Command center** — Scroll from landing to dashboard; point to **Treasury health** and **Stability Index** live stats.
2. **Policy & labs** — Toggle a **preset** (e.g. conservative → aggressive); show **effective policy** JSON updating. Set **simulated balance** below min → **Run once** → show **history row** + optional **transfer** column.
3. **Governance** — Switch to **Approval required**; run again → show **pending approval** + **Ops stream** (SSE); click **Approve** → second history entry.
4. **Safety** — Hit **Open circuit** → **Run once** → show **circuit_open** outcome; **Close circuit**.
5. **Playbook or Insights** — Open **Badges** or **Trust score** JSON; or show **`GET /metrics`** in terminal for Prometheus line.

**Narration bridge:**  
“Every step you see is also an API — judges can replay without our UI.”

---

## 3:15 – 4:25 | Technical Deep Dive

“**Architecture:** Node, TypeScript, Express. Orchestration in `agent.ts`; WDK is isolated in `wdkClient.ts` — swap HTTP for the official SDK without rewriting policy.  
**WDK proof:** we call the wallet **balance** endpoint and the **transfer** endpoint; simulation mode fakes balances for safe demos.  
**Autonomy:** the agent decides *when* and *how much* inside caps and cooldown; **strict governance** can block on extreme z-scores; **circuit breaker** is a hard stop.  
**Correctness:** persisted `agent-history.json`, CSV export, `audit/bundle` SHA-256, optional HMAC.”

*(Show 5–10 seconds of `wdkClient.ts` or split view: code + dashboard.)*

---

## 4:25 – 4:55 | Why It Wins + Real World

“We’re strong on **economic soundness** — caps, cooldown, optional daily budget — and **real applicability** for DAOs and ops teams.  
We’re differentiated on **auditability**: same data, same hashes, not vibes.  
**Next:** multi-asset rules and production WDK deployment behind your infra.”

---

## 4:55 – 5:00 | Closing

“Thanks — **StablePilot**. Repo: **[REPO_URL]**, full answers and disclosure in our `submission/` folder on GitHub.”

---

## B-Roll Checklist (if you edit)

- [ ] `GET /api/routes` count visible  
- [ ] `GET /openapi.json` or `/features`  
- [ ] Optional: terminal `curl -s localhost:8080/health | jq`  
- [ ] Clear audio; 1080p screen; hide real API keys  

---

## File Size / Platform Tips

- Export **MP4 (H.264)**; YouTube **Unlisted** or Loom **Public link**.  
- Verify link in **incognito** before submit.
