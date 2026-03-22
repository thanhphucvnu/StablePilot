import type { AutonomyModeName } from "./types";
import { buildAuditBundle } from "./auditBundle";
import { buildPolicyFingerprint } from "./policyFingerprint";
import { buildTreasurySummary } from "./treasurySummary";

export async function buildComplianceExport(
  autonomyMode: AutonomyModeName,
  history: Parameters<typeof buildAuditBundle>[0],
  loopRunning: boolean
): Promise<Record<string, unknown>> {
  const [audit, fingerprint, summary] = await Promise.all([
    Promise.resolve(buildAuditBundle(history, autonomyMode)),
    Promise.resolve(buildPolicyFingerprint(autonomyMode)),
    buildTreasurySummary(loopRunning)
  ]);
  return {
    exportedAt: new Date().toISOString(),
    disclosure: "Snapshot for compliance demos; verify file hashes independently when using signed audit bundles.",
    auditBundle: audit,
    policyFingerprint: fingerprint,
    treasurySummary: summary
  };
}
