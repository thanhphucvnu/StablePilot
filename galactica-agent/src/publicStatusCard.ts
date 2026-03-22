import type { AutonomyModeName } from "./types";

/** Tiny embed-friendly JSON for widgets / status pages. */
export function buildPublicStatusCard(input: {
  simulationMode: boolean;
  autonomyMode: AutonomyModeName;
  circuitOpen: boolean;
  healthScore: number;
  healthStatus: string;
  stabilityIndex: number;
  stabilityTier: string;
  usdtBalance: number;
}): Record<string, unknown> {
  return {
    service: "StablePilot",
    ok: !input.circuitOpen && input.healthStatus !== "critical",
    simulationMode: input.simulationMode,
    autonomyMode: input.autonomyMode,
    circuitOpen: input.circuitOpen,
    healthScore: input.healthScore,
    healthStatus: input.healthStatus,
    stabilityIndex: input.stabilityIndex,
    stabilityTier: input.stabilityTier,
    usdtBalance: input.usdtBalance,
    at: new Date().toISOString()
  };
}
