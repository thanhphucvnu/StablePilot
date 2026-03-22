import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import type { AgentRunRecord, PolicyDecision } from "./types";
import type { PipelineStep } from "./types";
import type { BalanceStatsSnapshot } from "./types";

const filePath = path.join(process.cwd(), "data", "pending-approvals.json");

export interface PendingApproval {
  id: string;
  createdAt: string;
  walletId: string;
  beforeBalance: number;
  decision: PolicyDecision;
  pipeline: PipelineStep[];
  stats?: BalanceStatsSnapshot;
  narrative?: string;
}

function ensureDir(): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadAll(): PendingApproval[] {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveAll(items: PendingApproval[]): void {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(items.slice(0, 50), null, 2), "utf-8");
}

export function listPendingApprovals(): PendingApproval[] {
  return loadAll();
}

export function hasOpenPending(): boolean {
  return loadAll().length > 0;
}

export function createPendingApproval(entry: Omit<PendingApproval, "id" | "createdAt">): PendingApproval {
  const all = loadAll();
  const id = `ap_${randomBytes(6).toString("hex")}`;
  const row: PendingApproval = {
    ...entry,
    id,
    createdAt: new Date().toISOString()
  };
  all.push(row);
  saveAll(all);
  return row;
}

export function takePendingById(id: string): PendingApproval | undefined {
  const all = loadAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return undefined;
  const [row] = all.splice(idx, 1);
  saveAll(all);
  return row;
}

export function clearAllPending(): void {
  saveAll([]);
}

/** Link executed transfer back to a proposal for auditors */
export function buildExecutedRecordFromApproval(
  p: PendingApproval,
  recordPartial: Pick<AgentRunRecord, "transfer" | "afterBalance" | "runId" | "at">
): AgentRunRecord {
  return {
    at: recordPartial.at,
    runId: recordPartial.runId,
    beforeBalance: p.beforeBalance,
    decision: p.decision,
    transfer: recordPartial.transfer,
    afterBalance: recordPartial.afterBalance,
    pipeline: p.pipeline,
    stats: p.stats,
    narrative: p.narrative,
    outcome: "approval_executed",
    approvalId: p.id
  };
}
