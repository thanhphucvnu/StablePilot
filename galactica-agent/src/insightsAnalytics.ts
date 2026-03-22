import type { AgentRunRecord, RunOutcome } from "./types";

function parseAt(at: string): number {
  const t = Date.parse(at);
  return Number.isFinite(t) ? t : 0;
}

function inWindow(row: AgentRunRecord, sinceMs: number): boolean {
  return parseAt(row.at) >= sinceMs;
}

export function buildRunAnalytics(rows: AgentRunRecord[]): {
  windows: { label: string; sinceMs: number; total: number; byOutcome: Record<string, number> }[];
  transferSuccessCount: number;
  transferFailCount: number;
  totalVolumeUsdt: number;
} {
  const now = Date.now();
  const day = now - 86_400_000;
  const week = now - 7 * 86_400_000;

  const windows = [
    { label: "24h", sinceMs: day },
    { label: "7d", sinceMs: week },
    { label: "all", sinceMs: 0 }
  ].map(({ label, sinceMs }) => {
    const slice = rows.filter((r) => inWindow(r, sinceMs));
    const byOutcome: Record<string, number> = {};
    for (const r of slice) {
      const o = r.outcome ?? "unknown";
      byOutcome[o] = (byOutcome[o] ?? 0) + 1;
    }
    return { label, sinceMs, total: slice.length, byOutcome };
  });

  let transferSuccessCount = 0;
  let transferFailCount = 0;
  let totalVolumeUsdt = 0;
  for (const r of rows) {
    if (r.transfer) {
      if (r.transfer.success) {
        transferSuccessCount += 1;
        if (r.decision?.amount) totalVolumeUsdt += r.decision.amount;
      } else {
        transferFailCount += 1;
      }
    }
  }

  return { windows, transferSuccessCount, transferFailCount, totalVolumeUsdt };
}

export function filterTransferLedger(rows: AgentRunRecord[]): AgentRunRecord[] {
  return rows.filter((r) => Boolean(r.transfer));
}

export function buildActivityReport(rows: AgentRunRecord[], feedCount: number): {
  historyRunCount: number;
  outcomesAllTime: Partial<Record<RunOutcome | "unknown", number>>;
  lastRunAt: string | null;
  activityFeedEntries: number;
} {
  const outcomesAllTime: Partial<Record<RunOutcome | "unknown", number>> = {};
  for (const r of rows) {
    const o = (r.outcome ?? "unknown") as RunOutcome | "unknown";
    outcomesAllTime[o] = (outcomesAllTime[o] ?? 0) + 1;
  }
  const last = rows[rows.length - 1];
  return {
    historyRunCount: rows.length,
    outcomesAllTime,
    lastRunAt: last?.at ?? null,
    activityFeedEntries: feedCount
  };
}
