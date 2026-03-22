import type { AgentRunRecord } from "./types";

/** UTC hour-of-day (0–23) → average observed beforeBalance for chart heatmaps. */
export function buildBalanceHeatmap(rows: AgentRunRecord[], maxRows = 400): {
  buckets: { hourUtc: number; sampleCount: number; avgBeforeBalance: number }[];
  note: string;
} {
  const slice = rows.slice(-maxRows);
  const sums: number[] = Array(24).fill(0);
  const counts: number[] = Array(24).fill(0);
  for (const r of slice) {
    const t = Date.parse(r.at);
    if (!Number.isFinite(t)) continue;
    const h = new Date(t).getUTCHours();
    sums[h] += r.beforeBalance;
    counts[h] += 1;
  }
  const buckets = sums.map((sum, hourUtc) => ({
    hourUtc,
    sampleCount: counts[hourUtc],
    avgBeforeBalance:
      counts[hourUtc] > 0 ? Math.round((sum / counts[hourUtc]) * 100) / 100 : 0
  }));
  return {
    buckets,
    note: "Averages use beforeBalance per run timestamp (UTC). Sparse hours may read 0."
  };
}
