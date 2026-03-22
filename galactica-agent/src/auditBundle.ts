import { createHash, createHmac } from "crypto";
import { config } from "./config";
import type { AutonomyModeName } from "./types";
import { getEffectivePolicy, getRuntimePreset } from "./runtimePreset";
import type { AgentRunRecord } from "./types";

function canonicalRunSlice(r: AgentRunRecord) {
  return {
    runId: r.runId,
    at: r.at,
    outcome: r.outcome ?? "",
    before: r.beforeBalance,
    after: r.afterBalance,
    shouldAct: r.decision.shouldAct,
    amount: r.decision.amount,
    z: r.stats?.zScore ?? null,
    approvalId: r.approvalId ?? ""
  };
}

export function buildAuditBundle(history: AgentRunRecord[], autonomyMode: AutonomyModeName) {
  const tail = history.slice(-150);
  const canonical = JSON.stringify(tail.map(canonicalRunSlice));
  const contentSha256 = createHash("sha256").update(canonical, "utf8").digest("hex");

  const policy = getEffectivePolicy();
  const policySnapshot = createHash("sha256")
    .update(
      JSON.stringify({
        preset: getRuntimePreset(),
        min: policy.minUsdtBalance,
        target: policy.targetUsdtBalance,
        maxTx: policy.maxTxAmount,
        strict: config.governanceStrict,
        zTh: config.governanceZThreshold,
        autonomy: autonomyMode
      }),
      "utf8"
    )
    .digest("hex");

  const secret = config.auditSigningSecret?.trim();
  const attestationHmac = secret
    ? createHmac("sha256", secret).update(`${contentSha256}|${policySnapshot}`).digest("hex")
    : undefined;

  return {
    version: "stablepilot-audit-bundle/1",
    generatedAt: new Date().toISOString(),
    runRecordsHashed: tail.length,
    contentSha256,
    policySnapshotSha256: policySnapshot,
    autonomyMode,
    walletId: config.wdkWalletId,
    attestationHmac,
    attestationAlgo: attestationHmac ? "HMAC-SHA256(secret+hashes)" : undefined,
    disclosure:
      "Hashes are deterministic from persisted run fields + effective policy snapshot; HMAC optional via AUDIT_SIGNING_SECRET for off-chain verification demos (not a legal attestation)."
  };
}