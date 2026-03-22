import { createHash, createHmac } from "node:crypto";
import { config } from "./config";
import { buildAuditBundle } from "./auditBundle";
import { buildPolicyFingerprint } from "./policyFingerprint";
import type { AgentRunRecord, AutonomyModeName } from "./types";

/** One-shot integrity object chaining policy fingerprint + audit hashes (optional HMAC). */
export function buildAttestationSnapshot(
  history: AgentRunRecord[],
  autonomyMode: AutonomyModeName
): Record<string, unknown> {
  const fp = buildPolicyFingerprint(autonomyMode);
  const bundle = buildAuditBundle(history, autonomyMode);
  const body = {
    at: new Date().toISOString(),
    policyFingerprintSha256: fp.policyFingerprintSha256,
    auditContentSha256: bundle.contentSha256,
    auditPolicySnapshotSha256: bundle.policySnapshotSha256,
    runRecordsHashed: bundle.runRecordsHashed
  };
  const canonical = JSON.stringify(body);
  const attestationRootSha256 = createHash("sha256").update(canonical, "utf8").digest("hex");

  const secret = config.auditSigningSecret?.trim();
  const attestationHmac = secret
    ? createHmac("sha256", secret).update(attestationRootSha256).digest("hex")
    : undefined;

  return {
    version: "stablepilot-attestation/1",
    ...body,
    attestationRootSha256,
    attestationHmac,
    disclosure:
      "Root binds policy fingerprint to audit content hashes; HMAC mirrors AUDIT_SIGNING_SECRET when set — for hackathon integrity demos, not legal attestation."
  };
}
