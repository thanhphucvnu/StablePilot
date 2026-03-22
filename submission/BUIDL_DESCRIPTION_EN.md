# StablePilot — BUIDL description (copy-paste)

Use the block that fits the DoraHacks character limit. All English.

---

## Ultra-short (~350 characters)

StablePilot is a Treasury Governance OS for USDT treasuries. It reads balances and executes transfers through **WDK**, then wraps every decision in a **four-layer pipeline**: policy rules, reproducible drift statistics (z-score on balance flow), a deterministic narrative, and an execution gate with optional **human approval**, cooldown, caps, and a **circuit breaker**. Operators get a live dashboard, 80+ APIs, OpenAPI, Prometheus metrics, audit hashes, and simulation—so autonomy stays **provable**, not “LLM vibes.”

---

## Short (2 sentences)

StablePilot automates USDT treasury top-ups using the **Wallet Development Kit (WDK)** behind a **governed four-layer pipeline**—rules, drift statistics, narrative, and execution—with optional approvals, strict z-score gates, and full audit exports. It ships a production-style **Express + TypeScript** API, dashboard, SSE ops stream, and judge-facing briefing endpoints for hackathon review.

---

## Medium (paragraph + bullets)

**StablePilot** helps DAOs and ops teams keep stablecoin treasuries within safe bounds without blind automation. The agent loops on **WDK** balance reads and bounded **USDT transfers**, but only after **policy**, **reproducible statistics** on balance deltas, a **deterministic explanation layer**, and **safety gates** (cooldown, per-tx cap, optional daily budget, circuit breaker). Teams can run **fully autonomous** or **approval-first** semi-autonomy.

**Highlights**

- **WDK:** real balance + transfer integration (`wdkClient.ts`); `SIMULATION_MODE` for public demos  
- **Governance:** presets, strict \|z\| veto, persisted approval queue  
- **Observability:** 80+ routes, `/openapi.json`, `/metrics`, `/briefing/judge`  
- **Trust:** CSV/JSON history, audit bundle + policy fingerprint  

**Stack:** Node 20, TypeScript, Express · **Repo:** github.com/thanhphucvnu/StablePilot  

---

## One-line tagline (if the form asks separately)

**Treasury Governance OS:** WDK-backed USDT automation with a reproducible pipeline, optional human approval, and audit-grade exports.

---

## Problem + solution (two short paragraphs, “story” style)

**Problem:** Treasury teams still babysit hot wallets manually. Mistakes and delays cause liquidity gaps; generic AI demos can’t satisfy finance or auditors because they lack reproducible math and wallet-grade execution.

**Solution:** StablePilot closes the loop with **WDK** and a **four-layer governance pipeline** so every run is **policy-bound**, **statistically grounded**, **explained**, and **logged**—with optional human sign-off before funds move. Built for real submission criteria: autonomy, economic guardrails, and clear integration points.
