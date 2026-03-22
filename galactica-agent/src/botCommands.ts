/**
 * Minimal "chatbot-style" command router for Slack/Discord-style integrations.
 * POST JSON { "text": "..." } — no AI, deterministic replies.
 */
export function routeBotCommand(text: string): { command: string; reply: Record<string, unknown> } {
  const line = text.trim().split(/\r?\n/)[0] ?? "";
  const [cmd, ...rest] = line.split(/\s+/);
  const arg = rest.join(" ").trim();
  const c = (cmd ?? "").toLowerCase();

  if (!c || c === "help" || c === "start") {
    return {
      command: "help",
      reply: {
        message: "StablePilot bot commands",
        commands: [
          "help — this list",
          "ping — alive check",
          "version — package version (call GET /version from your worker)",
          "tip <keyword> — governance tips (try: zscore, approval, circuit)"
        ],
        note: "Wire your bot to proxy these strings to POST /integrations/command"
      }
    };
  }

  if (c === "ping") {
    return {
      command: "ping",
      reply: { pong: true, at: new Date().toISOString() }
    };
  }

  if (c === "tip") {
    const k = arg.toLowerCase();
    const tips: Record<string, string> = {
      zscore:
        "High |z| under GOVERNANCE_STRICT blocks transfers — same math as industrial SPC charts.",
      approval:
        "Approval mode queues WDK transfers — enterprise-style four-eyes before funds move.",
      circuit:
        "Circuit breaker is a hard kill switch — POST /safety/circuit { open: false } to resume.",
      tsi: "Treasury Stability Index blends health, z-calm, and ops headroom — GET /insights/stability-index."
    };
    const body = tips[k] ?? tips.tsi;
    return { command: "tip", reply: { topic: k || "tsi", text: body } };
  }

  return {
    command: "unknown",
    reply: {
      error: `Unknown command "${c}". Try: help`,
      received: line.slice(0, 200)
    }
  };
}
