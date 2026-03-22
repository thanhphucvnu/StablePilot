/** Narrative hooks for judges — maps shipped differentiators to concrete routes / files. */
export function buildInnovationManifest(): {
  title: string;
  pillars: { name: string; innovation: string; proof: string }[];
} {
  return {
    title: "StablePilot innovation surface",
    pillars: [
      {
        name: "Treasury Stability Index (TSI)",
        innovation: "Single 0–100 score fusing liquidity health, z-score calm, and ops gates — not a raw LLM score.",
        proof: "GET /insights/stability-index"
      },
      {
        name: "Policy matrix (shadow compare)",
        innovation: "Side-by-side effective min/target/max for all presets from the same .env without flipping runtime.",
        proof: "GET /policy/matrix"
      },
      {
        name: "Attestation chain",
        innovation: "Deterministic root hash binding policy fingerprint to audit content + optional HMAC.",
        proof: "GET /attestation/snapshot"
      },
      {
        name: "Scenario chain lab",
        innovation: "Multi-step scripted liquidity narrative in one API call for repeatable judge videos.",
        proof: "POST /lab/scenario-chain"
      },
      {
        name: "Dual-wallet telemetry",
        innovation: "Primary execution wallet + optional secondary read-only snapshot for org-level storytelling.",
        proof: "GET /wallet/snapshots/all"
      },
      {
        name: "Signed webhooks",
        innovation: "Optional HMAC signature header on outbound events for verifier integrations.",
        proof: "WEBHOOK_HMAC_SECRET + any webhook event"
      }
    ]
  };
}
