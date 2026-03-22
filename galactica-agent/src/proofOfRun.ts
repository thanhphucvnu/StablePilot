import { createHash } from "node:crypto";
import type { AgentRunRecord } from "./types";

export function buildProofOfRun(record: AgentRunRecord | undefined): {
  ok: boolean;
  runId?: number;
  proofSha256?: string;
  verifyHint?: string;
  canonical?: Record<string, unknown>;
} {
  if (!record) {
    return { ok: false };
  }
  const canonical = {
    runId: record.runId,
    at: record.at,
    outcome: record.outcome ?? "",
    beforeBalance: record.beforeBalance,
    afterBalance: record.afterBalance,
    shouldAct: record.decision.shouldAct,
    amount: record.decision.amount,
    zScore: record.stats?.zScore ?? null,
    txId: record.transfer?.txId ?? ""
  };
  const proofSha256 = createHash("sha256")
    .update(JSON.stringify(canonical), "utf8")
    .digest("hex");
  return {
    ok: true,
    runId: record.runId,
    proofSha256,
    verifyHint: "Recompute SHA-256 over canonical JSON with the same key order and nulls.",
    canonical
  };
}
