import type { AutonomyModeName } from "./types";

export function buildOnePagerMarkdown(input: {
  walletId: string;
  usdtBalance: number;
  healthScore: number;
  healthStatus: string;
  stabilityIndex: number;
  stabilityTier: string;
  trustScore: number;
  trustTier: string;
  autonomyMode: AutonomyModeName;
  openApprovals: number;
  circuitOpen: boolean;
  runCount: number;
}): string {
  return [
    "# StablePilot — executive one-pager",
    "",
    `*Live snapshot (${new Date().toISOString()})*`,
    "",
    "## Position",
    `- **Wallet:** ${input.walletId} · **USDT:** ${input.usdtBalance}`,
    `- **Health:** ${input.healthScore}/100 (${input.healthStatus})`,
    `- **Treasury Stability Index:** ${input.stabilityIndex}/100 (${input.stabilityTier})`,
    `- **Judge trust score:** ${input.trustScore}/100 (${input.trustTier})`,
    "",
    "## Governance",
    `- **Autonomy:** ${input.autonomyMode}`,
    `- **Open approvals:** ${input.openApprovals}`,
    `- **Circuit breaker:** ${input.circuitOpen ? "OPEN" : "closed"}`,
    "",
    "## Proof",
    `- **Persisted runs in view:** ${input.runCount}`,
    "- Audit bundle + policy fingerprint + attestation snapshot available over HTTP.",
    "",
    "_Generated without LLM — numbers come from the same APIs as the dashboard._"
  ].join("\n");
}
