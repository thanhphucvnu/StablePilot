const agentStateEl = document.getElementById("agentState");
const agentIntervalEl = document.getElementById("agentInterval");
const cooldownLineEl = document.getElementById("cooldownLine");
const walletBalanceEl = document.getElementById("walletBalance");
const walletMetaEl = document.getElementById("walletMeta");
const effectivePolicyEl = document.getElementById("effectivePolicy");
const historyBodyEl = document.getElementById("historyBody");
const actionLogEl = document.getElementById("actionLog");
const healthScoreEl = document.getElementById("healthScore");
const healthFillEl = document.getElementById("healthFill");
const healthBadgeEl = document.getElementById("healthBadge");
const healthMetaEl = document.getElementById("healthMeta");
const govMetaEl = document.getElementById("govMeta");
const pendingListEl = document.getElementById("pendingList");
const activityFeedEl = document.getElementById("activityFeed");
const simCard = document.getElementById("simCard");
const simHint = document.getElementById("simHint");
const simBalanceInput = document.getElementById("simBalanceInput");
const simApplyBtn = document.getElementById("simApplyBtn");
const portfolioBlock = document.getElementById("portfolioBlock");
const portfolioCard = document.getElementById("portfolioCard");
const labCard = document.getElementById("labCard");
const explainRunId = document.getElementById("explainRunId");
const explainBtn = document.getElementById("explainBtn");
const explainOut = document.getElementById("explainOut");
const explainHint = document.getElementById("explainHint");
const safetyMetaEl = document.getElementById("safetyMeta");
const insightsOutEl = document.getElementById("insightsOut");
const playbookOutEl = document.getElementById("playbookOut");

/** @type {string} */
let explorerTxTemplate = "";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function explorerHref(txId) {
  if (!explorerTxTemplate || !/^0x[a-fA-F0-9]{8,128}$/.test(txId)) return null;
  return explorerTxTemplate.replace(/\{\{txId\}\}/g, txId).replace(/\{\{txHash\}\}/g, txId);
}

function formatTransferHtml(run) {
  if (!run.transfer) return "—";
  const ok = run.transfer.success ? "OK" : "FAIL";
  const txId = run.transfer.txId || "";
  const href = explorerHref(txId);
  const txPart = href
    ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(txId.slice(0, 12))}…</a>`
    : escapeHtml(txId || "—");
  return `${ok} ${txPart}`;
}

function log(message) {
  const now = new Date().toLocaleTimeString();
  const line = `[${now}] ${message}`;
  actionLogEl.textContent = `${line}\n${actionLogEl.textContent}`.trim();
}

async function api(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function setPresetButtonsActive(preset) {
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    const p = btn.getAttribute("data-preset");
    btn.classList.toggle("preset-active", p === preset);
  });
}

function setAutonomyButtonsActive(mode) {
  document.querySelectorAll(".autonomy-btn").forEach((btn) => {
    const m = btn.getAttribute("data-mode");
    btn.classList.toggle("autonomy-active", m === mode);
  });
}

function renderHistory(history) {
  historyBodyEl.innerHTML = "";
  const rows = [...history].reverse().slice(0, 20);
  if (rows.length === 0) {
    historyBodyEl.innerHTML = "<tr><td colspan='9' class='muted'>No runs yet.</td></tr>";
    return;
  }

  for (const run of rows) {
    const tr = document.createElement("tr");
    let note = "—";
    if (run.deferralReason === "cooldown") note = "Cooldown";
    else if (run.deferralReason === "approval_queue") note = "Prior approval";
    else if (run.approvalId) note = `${run.approvalId.slice(0, 14)}…`;
    const reason = (run.decision.reason || "").slice(0, 72);
    const outcome = run.outcome ?? "—";
    tr.innerHTML = `
      <td>${run.runId ?? "—"}</td>
      <td>${new Date(run.at).toLocaleTimeString()}</td>
      <td>${run.beforeBalance}</td>
      <td>${escapeHtml(reason)}</td>
      <td>${run.decision.amount}</td>
      <td>${formatTransferHtml(run)}</td>
      <td>${run.afterBalance}</td>
      <td><small>${escapeHtml(outcome)}</small></td>
      <td><small>${escapeHtml(note)}</small></td>
    `;
    historyBodyEl.appendChild(tr);
  }
}

async function refreshStatus() {
  const status = await api("/agent/status");
  agentStateEl.textContent = status.running ? "RUNNING" : "STOPPED";
  agentStateEl.style.color = status.running ? "#4ade80" : "#f87171";
  const envI = status.runIntervalEnvMs != null ? status.runIntervalEnvMs : status.runIntervalMs;
  agentIntervalEl.textContent = `Interval: ${status.runIntervalMs} ms (env ${envI}) · Preset: ${status.preset} · Autonomy: ${status.autonomyMode}`;
  const maint = status.maintenanceFrozen ? "Maintenance: FROZEN" : "Maintenance: off";
  if (status.cooldownRemainingMs > 0) {
    cooldownLineEl.textContent = `Transfer cooldown: ${Math.ceil(status.cooldownRemainingMs / 1000)}s · Open approvals: ${status.openApprovals} · ${maint}`;
  } else {
    cooldownLineEl.textContent = `Transfer cooldown: ready · Open approvals: ${status.openApprovals} · ${maint}`;
  }
  setPresetButtonsActive(status.preset);
  setAutonomyButtonsActive(status.autonomyMode);
}

async function refreshHealth() {
  try {
    const h = await api("/treasury/health");
    healthScoreEl.textContent = `${h.healthScore}`;
    healthFillEl.style.width = `${h.healthScore}%`;
    healthBadgeEl.style.display = "inline-block";
    healthBadgeEl.textContent = h.status;
    healthBadgeEl.className = `badge ${h.status}`;
    const runway =
      h.runwayHours === null || h.runwayHours === undefined
        ? "n/a"
        : `${h.runwayHours.toFixed(1)}h est.`;
    healthMetaEl.textContent = `Distance to min: ${h.distanceToMin} · Runs (24h): ${h.runsLast24h} · Floor: ${h.effectiveMin} USDT · Runway: ${runway}`;
  } catch (e) {
    healthScoreEl.textContent = "—";
    healthMetaEl.textContent = e.message || "Health unavailable";
  }
}

async function refreshGovMeta() {
  try {
    const h = await api("/health");
    govMetaEl.textContent = `Strict statistics gate: ${h.governanceStrict ? "ON" : "off"} (|z| > ${h.governanceZThreshold} blocks WDK transfer) · autonomy: ${h.autonomyMode}`;
  } catch {
    govMetaEl.textContent = "—";
  }
}

async function refreshSnapshot() {
  const snapshot = await api("/wallet/snapshot");
  walletBalanceEl.textContent = String(snapshot.usdtBalance);
  walletMetaEl.textContent = `Wallet: ${snapshot.walletId} · Updated: ${new Date(snapshot.updatedAt).toLocaleTimeString()}`;
}

async function refreshConfig() {
  const cfg = await api("/agent/config");
  explorerTxTemplate = (cfg.blockExplorerTxUrlTemplate || "").trim();
  const block = {
    preset: cfg.preset,
    effectivePolicy: cfg.effectivePolicy,
    basePolicy: cfg.basePolicy,
    cooldownMs: cfg.transferCooldownMs,
    webhook: cfg.webhookUrl,
    autonomyMode: cfg.autonomyMode,
    governanceStrict: cfg.governanceStrict,
    governanceZThreshold: cfg.governanceZThreshold
  };
  effectivePolicyEl.textContent = JSON.stringify(block, null, 2);
}

async function refreshPending() {
  try {
    const list = await api("/governance/pending");
    if (!list.length) {
      pendingListEl.innerHTML = '<span class="muted">No pending actions.</span>';
      return;
    }
    pendingListEl.innerHTML = list
      .map((p) => {
        const z = p.stats?.zScore != null ? p.stats.zScore.toFixed(2) : "n/a";
        return `<div class="pending-box">
          <strong>${p.id}</strong> · ${p.decision.amount} USDT · z=${z}<br/>
          <span class="muted">${(p.narrative || "").slice(0, 120)}…</span><br/>
          <button type="button" class="mini approve-btn" data-id="${p.id}">Approve WDK transfer</button>
          <button type="button" class="mini secondary reject-btn" data-id="${p.id}">Reject</button>
        </div>`;
      })
      .join("");
    pendingListEl.querySelectorAll(".approve-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          await api(`/governance/approve/${id}`, { method: "POST" });
          log(`Approved ${id}`);
          await refreshAll();
        } catch (e) {
          log(`Approve failed: ${e.message}`);
        }
      });
    });
    pendingListEl.querySelectorAll(".reject-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          await api(`/governance/reject/${id}`, { method: "POST" });
          log(`Rejected ${id}`);
          await refreshAll();
        } catch (e) {
          log(`Reject failed: ${e.message}`);
        }
      });
    });
  } catch {
    pendingListEl.textContent = "—";
  }
}

async function refreshSafety() {
  try {
    const s = await api("/safety/status");
    const b = s.budget;
    const budgetLine =
      b.cap == null
        ? "Daily USDT transfer cap: off (unlimited)."
        : `Daily cap ${b.cap} USDT — spent ${b.spentUsdt} on ${b.utcDay} UTC, remaining ${b.remaining}.`;
    const ex = s.txExplorerTemplateConfigured
      ? "Explorer links: on"
      : "Explorer links: off (set BLOCK_EXPLORER_TX_URL_TEMPLATE)";
    const mf = s.maintenanceFrozen ? "Maintenance: FROZEN" : "Maintenance: off";
    safetyMetaEl.innerHTML = `<strong>Circuit:</strong> ${s.circuitOpen ? "OPEN (all outbound transfers blocked)" : "closed"}. <strong>${mf}</strong>. ${budgetLine} <strong>Audit HMAC:</strong> ${s.auditSigningConfigured ? "configured" : "not set"}. <strong>${ex}</strong>.`;
  } catch (e) {
    safetyMetaEl.textContent = e.message || "—";
  }
}

async function refreshActivity() {
  try {
    const items = await api("/activity");
    activityFeedEl.innerHTML = items
      .slice(0, 40)
      .map(
        (a) =>
          `<div class="feed-line"><span class="muted">${new Date(a.at).toLocaleTimeString()}</span> [${a.kind}] <strong>${a.title}</strong> — ${a.detail}</div>`
      )
      .join("");
    if (!items.length) activityFeedEl.innerHTML = '<span class="muted">No events yet.</span>';
  } catch {
    activityFeedEl.textContent = "—";
  }
}

async function refreshHistory() {
  const history = await api("/agent/history");
  renderHistory(history);
  if (history.length && explainRunId && !explainRunId.value) {
    explainRunId.value = String(history[history.length - 1].runId);
  }
}

async function refreshPortfolio() {
  try {
    const p = await api("/treasury/portfolio");
    portfolioBlock.textContent = JSON.stringify(p, null, 2);
    portfolioCard.style.opacity = "1";
  } catch (e) {
    portfolioBlock.textContent =
      (e.message || "N/A") +
      "\n\n(Live WDK: use /wallet/snapshot; map extra walletIds in production for a real multi-vault view.)";
    portfolioCard.style.opacity = "0.55";
  }
}

async function refreshSimulationUi() {
  try {
    const h = await api("/health");
    const sim = h.simulationMode;
    simCard.style.opacity = sim ? "1" : "0.45";
    simApplyBtn.disabled = !sim;
    simBalanceInput.disabled = !sim;
    simHint.textContent = sim
      ? "Adjust balance instantly for judges — no chain required."
      : "Disabled: server is in live WDK mode (SIMULATION_MODE=false).";
    labCard.querySelectorAll(".shock-btn").forEach((b) => {
      b.disabled = !sim;
    });
    explainHint.textContent = h.explainEnabled
      ? "OPENAI_API_KEY is set — Executive explain is available."
      : "No OPENAI_API_KEY — each run still includes a deterministic narrative without LLM.";
  } catch {
    simHint.textContent = "Could not read server mode.";
  }
}

async function refreshHero() {
  const tsiEl = document.getElementById("heroTsi");
  const tierEl = document.getElementById("heroTier");
  const verEl = document.getElementById("heroVer");
  if (!tsiEl || !tierEl || !verEl) return;
  try {
    const vr = await fetch("/version");
    const vj = await vr.json();
    verEl.textContent = vj.version ?? "—";
  } catch {
    verEl.textContent = "—";
  }
  try {
    const tr = await fetch("/insights/stability-index");
    const tj = await tr.json();
    if (!tr.ok) throw new Error(tj.error || tr.statusText);
    tsiEl.textContent = tj.stabilityIndex != null ? String(tj.stabilityIndex) : "—";
    tierEl.textContent = tj.tier ? String(tj.tier) : "—";
  } catch {
    tsiEl.textContent = "—";
    tierEl.textContent = "—";
  }
}

async function refreshAll() {
  await Promise.all([
    refreshStatus(),
    refreshHealth(),
    refreshGovMeta(),
    refreshSnapshot(),
    refreshConfig(),
    refreshHistory(),
    refreshSimulationUi(),
    refreshPending(),
    refreshActivity(),
    refreshPortfolio(),
    refreshSafety(),
    refreshHero()
  ]);
}

document.getElementById("startBtn").addEventListener("click", async () => {
  try {
    await api("/agent/start", { method: "POST" });
    log("Agent loop started.");
    await refreshAll();
  } catch (error) {
    log(`Start failed: ${error.message}`);
  }
});

document.getElementById("stopBtn").addEventListener("click", async () => {
  try {
    await api("/agent/stop", { method: "POST" });
    log("Agent loop stopped.");
    await refreshAll();
  } catch (error) {
    log(`Stop failed: ${error.message}`);
  }
});

document.getElementById("runBtn").addEventListener("click", async () => {
  try {
    const run = await api("/agent/run", { method: "POST" });
    const extra = run.deferralReason ? ` [${run.deferralReason}]` : "";
    const oc = run.outcome ? ` outcome=${run.outcome}` : "";
    let line = `Run #${run.runId}: ${run.decision.reason} amount=${run.decision.amount}${extra}${oc}`;
    if (run.explorerUrl) line += ` · ${run.explorerUrl}`;
    log(line);
    await refreshAll();
  } catch (error) {
    log(`Run failed: ${error.message}`);
  }
});

document.getElementById("refreshSnapshotBtn").addEventListener("click", async () => {
  try {
    await refreshSnapshot();
    await refreshHealth();
    log("Wallet snapshot refreshed.");
  } catch (error) {
    log(`Snapshot failed: ${error.message}`);
  }
});

document.getElementById("refreshHistoryBtn").addEventListener("click", async () => {
  try {
    await refreshHistory();
    log("History refreshed.");
  } catch (error) {
    log(`History failed: ${error.message}`);
  }
});

document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const preset = btn.getAttribute("data-preset");
    try {
      await api("/agent/preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset })
      });
      log(`Preset → ${preset}`);
      await refreshAll();
    } catch (error) {
      log(`Preset failed: ${error.message}`);
    }
  });
});

document.querySelectorAll(".autonomy-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const mode = btn.getAttribute("data-mode");
    try {
      await api("/agent/autonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      log(`Autonomy → ${mode}`);
      await refreshAll();
    } catch (error) {
      log(`Autonomy failed: ${error.message}`);
    }
  });
});

document.querySelectorAll(".shock-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const kind = btn.getAttribute("data-kind");
    const mag = Number(btn.getAttribute("data-mag"));
    try {
      await api("/lab/shock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, magnitude: mag })
      });
      log(`Stress: ${kind}`);
      await refreshAll();
    } catch (e) {
      log(`Stress lab failed: ${e.message}`);
    }
  });
});

explainBtn.addEventListener("click", async () => {
  const runId = Number(explainRunId.value);
  if (!Number.isFinite(runId)) {
    log("Enter a valid runId.");
    return;
  }
  try {
    const data = await api("/insights/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId })
    });
    explainOut.textContent = data.llmExecutiveBrief || data.deterministicNarrative || JSON.stringify(data);
    log(`Explain run #${runId}`);
  } catch (e) {
    explainOut.textContent = e.message || "Error";
    log(`Explain failed: ${e.message}`);
  }
});

document.getElementById("circuitOpenBtn").addEventListener("click", async () => {
  try {
    await api("/safety/circuit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ open: true })
    });
    log("Circuit OPEN — transfers blocked.");
    await refreshAll();
  } catch (e) {
    log(`Circuit: ${e.message}`);
  }
});

document.getElementById("circuitCloseBtn").addEventListener("click", async () => {
  try {
    await api("/safety/circuit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ open: false })
    });
    log("Circuit closed.");
    await refreshAll();
  } catch (e) {
    log(`Circuit: ${e.message}`);
  }
});

simApplyBtn.addEventListener("click", async () => {
  const value = Number(simBalanceInput.value);
  try {
    await api("/sim/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balance: value })
    });
    log(`Simulation balance set to ${value} USDT.`);
    await refreshAll();
  } catch (error) {
    log(`Sim balance failed: ${error.message}`);
  }
});

function connectSse() {
  if (typeof EventSource === "undefined") return;
  const es = new EventSource("/events/stream");
  es.onmessage = (ev) => {
    try {
      const a = JSON.parse(ev.data);
      const div = document.createElement("div");
      div.className = "feed-line";
      div.innerHTML = `<span class="muted">${new Date(a.at).toLocaleTimeString()}</span> [${a.kind}] <strong>${a.title}</strong> — ${a.detail}`;
      activityFeedEl.insertBefore(div, activityFeedEl.firstChild);
      while (activityFeedEl.children.length > 48) {
        activityFeedEl.removeChild(activityFeedEl.lastChild);
      }
    } catch (_) {
      /* ignore malformed */
    }
  };
  es.onerror = () => {
    es.close();
    setTimeout(connectSse, 4000);
  };
}

function setInsightsPayload(data) {
  if (!insightsOutEl) return;
  insightsOutEl.textContent =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

async function loadInsights(path, init) {
  if (!insightsOutEl) return;
  try {
    const res = await fetch(path, init);
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
      setInsightsPayload(j);
    } else {
      const t = await res.text();
      if (!res.ok) throw new Error(t || res.statusText);
      setInsightsPayload(t);
    }
  } catch (e) {
    setInsightsPayload(e.message || String(e));
  }
}

function bindInsights(id, path, init) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", () => loadInsights(path, init));
}

bindInsights("btnTreasurySummary", "/treasury/summary");
bindInsights("btnAnalytics", "/insights/analytics");
bindInsights("btnZstats", "/insights/zstats");
bindInsights("btnGovStats", "/governance/stats");
bindInsights("btnActivityReport", "/report/activity");
bindInsights("btnCompliance", "/export/compliance");
bindInsights("btnPipelineDoc", "/pipeline/layers");
bindInsights("btnTsi", "/insights/stability-index");
bindInsights("btnPolicyMatrix", "/policy/matrix");
bindInsights("btnAttestation", "/attestation/snapshot");
bindInsights("btnDualWallet", "/wallet/snapshots/all");

document.getElementById("btnScenarioChain")?.addEventListener("click", async () => {
  try {
    const j = await api("/lab/scenario-chain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steps: [
          { kind: "flash_drop", magnitude: 22 },
          { kind: "sudden_inflow", magnitude: 180 },
          { kind: "drain_small", magnitude: 35 }
        ]
      })
    });
    setInsightsPayload(j);
    log("Scenario chain demo executed.");
    await refreshAll();
  } catch (e) {
    setInsightsPayload(e.message || String(e));
  }
});

document.getElementById("btnWebhookTest")?.addEventListener("click", async () => {
  try {
    const j = await api("/ops/webhook/test", { method: "POST" });
    setInsightsPayload(j);
    log("Webhook test invoked.");
  } catch (e) {
    setInsightsPayload(e.message || String(e));
  }
});

document.getElementById("btnMaintFreeze")?.addEventListener("click", async () => {
  try {
    const j = await api("/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frozen: true })
    });
    setInsightsPayload(j);
    log("Maintenance freeze ON.");
    await refreshAll();
  } catch (e) {
    setInsightsPayload(e.message || String(e));
  }
});

document.getElementById("btnMaintThaw")?.addEventListener("click", async () => {
  try {
    const j = await api("/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frozen: false })
    });
    setInsightsPayload(j);
    log("Maintenance freeze OFF.");
    await refreshAll();
  } catch (e) {
    setInsightsPayload(e.message || String(e));
  }
});

document.getElementById("btnClearActivity")?.addEventListener("click", async () => {
  try {
    const j = await api("/ops/activity/clear", { method: "POST" });
    setInsightsPayload(j);
    log("Activity feed cleared.");
    await refreshAll();
  } catch (e) {
    setInsightsPayload(e.message || String(e));
  }
});

document.getElementById("btnResetBudget")?.addEventListener("click", async () => {
  try {
    const j = await api("/safety/budget/reset", { method: "POST" });
    setInsightsPayload(j);
    log("Daily budget counter reset.");
    await refreshAll();
  } catch (e) {
    setInsightsPayload(e.message || String(e));
  }
});

document.querySelectorAll(".scenario-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const scenario = btn.getAttribute("data-scenario");
    try {
      const j = await api("/sim/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario })
      });
      setInsightsPayload(j);
      log(`Scenario ${scenario}`);
      await refreshAll();
    } catch (e) {
      setInsightsPayload(e.message || String(e));
    }
  });
});

document.getElementById("btnBatchRun")?.addEventListener("click", async () => {
  const n = Number(document.getElementById("batchRunCount")?.value ?? 1);
  try {
    const j = await api("/agent/run/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: n })
    });
    setInsightsPayload(j);
    log(`Batch run ×${n}`);
    await refreshAll();
  } catch (e) {
    setInsightsPayload(e.message || String(e));
  }
});

document.getElementById("btnSetInterval")?.addEventListener("click", async () => {
  const raw = document.getElementById("intervalMsInput")?.value?.trim();
  try {
    const body =
      raw === "" || raw === undefined
        ? { ms: null }
        : { ms: Number(raw) };
    const j = await api("/runtime/interval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setInsightsPayload(j);
    log("Runtime interval updated.");
    await refreshAll();
  } catch (e) {
    setInsightsPayload(e.message || String(e));
  }
});

function setPlaybookPayload(data) {
  if (!playbookOutEl) return;
  playbookOutEl.textContent =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

async function loadPlaybook(path, init) {
  if (!playbookOutEl) return;
  try {
    const res = await fetch(path, init);
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || res.statusText);
      setPlaybookPayload(j);
    } else {
      const t = await res.text();
      if (!res.ok) throw new Error(t || res.statusText);
      setPlaybookPayload(t);
    }
  } catch (e) {
    setPlaybookPayload(e.message || String(e));
  }
}

document.querySelectorAll(".pb-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const p = btn.getAttribute("data-path");
    if (p) loadPlaybook(p);
  });
});

document.getElementById("btnCompareRuns")?.addEventListener("click", () => {
  const a = document.getElementById("compareRunA")?.value;
  const b = document.getElementById("compareRunB")?.value;
  loadPlaybook(`/insights/compare-runs?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
});

document.getElementById("btnRunwayWhatif")?.addEventListener("click", async () => {
  const burn = Number(document.getElementById("runwayBurnInput")?.value ?? NaN);
  try {
    const j = await api("/insights/runway-whatif", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ burnPerDay: burn })
    });
    setPlaybookPayload(j);
  } catch (e) {
    setPlaybookPayload(e.message || String(e));
  }
});

document.getElementById("btnPolicyDiff")?.addEventListener("click", () => {
  const from = document.getElementById("policyDiffFrom")?.value ?? "conservative";
  const to = document.getElementById("policyDiffTo")?.value ?? "aggressive";
  loadPlaybook(`/policy/diff?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
});

document.getElementById("btnPreviewImpact")?.addEventListener("click", async () => {
  const amount = Number(document.getElementById("previewAmountInput")?.value ?? NaN);
  try {
    const j = await api("/governance/preview-impact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount })
    });
    setPlaybookPayload(j);
  } catch (e) {
    setPlaybookPayload(e.message || String(e));
  }
});

document.getElementById("btnGoalSave")?.addEventListener("click", async () => {
  const target = Number(document.getElementById("goalTargetInput")?.value ?? NaN);
  const label = document.getElementById("goalLabelInput")?.value ?? "";
  try {
    const j = await api("/goals/treasury", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUsdt: target, label })
    });
    setPlaybookPayload(j);
    log("Treasury goal saved.");
  } catch (e) {
    setPlaybookPayload(e.message || String(e));
  }
});

document.getElementById("btnGoalClear")?.addEventListener("click", async () => {
  try {
    const j = await api("/goals/treasury", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: null })
    });
    setPlaybookPayload(j);
    log("Treasury goal cleared.");
  } catch (e) {
    setPlaybookPayload(e.message || String(e));
  }
});

document.getElementById("btnBotSend")?.addEventListener("click", async () => {
  const text = document.getElementById("botCommandInput")?.value ?? "";
  try {
    const j = await api("/integrations/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    setPlaybookPayload(j);
  } catch (e) {
    setPlaybookPayload(e.message || String(e));
  }
});

document.getElementById("btnProofRun")?.addEventListener("click", () => {
  const id = document.getElementById("proofRunIdInput")?.value;
  loadPlaybook(`/proof/run/${encodeURIComponent(id)}`);
});

document.querySelectorAll("#mainNav .nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-panel");
    document.querySelectorAll("#mainNav .nav-btn").forEach((b) => {
      b.classList.toggle("active", b === btn);
    });
    document.querySelectorAll(".panel").forEach((p) => {
      p.classList.toggle("active", p.id === `panel-${id}`);
    });
  });
});

document.getElementById("loadBriefingBtn").addEventListener("click", async () => {
  const el = document.getElementById("judgeBriefingOut");
  try {
    const data = await api("/briefing/judge");
    el.textContent = JSON.stringify(data, null, 2);
    log("Loaded judge briefing.");
  } catch (e) {
    el.textContent = e.message || String(e);
    log(`Briefing failed: ${e.message}`);
  }
});

document.getElementById("runPreviewBtn").addEventListener("click", async () => {
  const el = document.getElementById("previewOut");
  const raw = document.getElementById("previewBalanceInput").value;
  const body = {};
  if (raw !== "" && Number.isFinite(Number(raw))) {
    body.balance = Number(raw);
  }
  try {
    const data = await api("/agent/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    el.textContent = JSON.stringify(data, null, 2);
    log("Preview run complete.");
  } catch (e) {
    el.textContent = e.message || String(e);
    log(`Preview failed: ${e.message}`);
  }
});

refreshAll()
  .then(() => {
    log(
      "Dashboard ready — tabbed UI; Judge pack tab loads /briefing/judge; SSE on /events/stream."
    );
    connectSse();
  })
  .catch((error) => log(`Initial load error: ${error.message}`));

setInterval(() => {
  refreshStatus().catch(() => {});
  refreshHealth().catch(() => {});
  refreshHistory().catch(() => {});
  refreshPending().catch(() => {});
  refreshActivity().catch(() => {});
  refreshSafety().catch(() => {});
  refreshHero().catch(() => {});
}, 5000);
