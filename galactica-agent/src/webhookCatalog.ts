export function buildWebhookEventCatalog(): {
  events: { name: string; when: string }[];
  signing: string;
} {
  return {
    events: [
      { name: "transfer_executed", when: "Autonomous transfer succeeded" },
      { name: "transfer_failed", when: "Autonomous transfer failed" },
      { name: "transfer_deferred_cooldown", when: "Cooldown blocked transfer" },
      { name: "transfer_blocked_statistics", when: "Strict z-gate blocked" },
      { name: "transfer_budget_blocked", when: "Daily cap blocked" },
      { name: "approval_required", when: "Queued for human approval" },
      { name: "approval_transfer_ok", when: "Human approved + WDK ok" },
      { name: "approval_transfer_fail", when: "Human approved + WDK failed" },
      { name: "approval_rejected", when: "Human rejected proposal" },
      { name: "circuit_blocked_run", when: "Run while circuit open" },
      { name: "ops_ping", when: "Manual POST /ops/webhook/test" }
    ],
    signing:
      "When WEBHOOK_HMAC_SECRET is set, payloads include header X-StablePilot-Signature: sha256=<hex> over the raw JSON body."
  };
}
