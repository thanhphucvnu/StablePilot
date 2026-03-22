import { AgentRunRecord } from "./types";

/** Hours until balance reaches min, from historical drain rate; null if unknown. */
export function estimateRunwayHours(
  currentBalance: number,
  minBalance: number,
  history: AgentRunRecord[]
): number | null {
  if (currentBalance <= minBalance) return 0;
  if (history.length < 3) return null;

  let totalDrop = 0;
  let totalMs = 0;

  for (let i = 1; i < history.length; i += 1) {
    const prev = history[i - 1]!;
    const cur = history[i]!;
    const b0 = prev.beforeBalance;
    const b1 = cur.beforeBalance;
    const dt = new Date(cur.at).getTime() - new Date(prev.at).getTime();
    if (dt <= 0 || b1 >= b0) continue;
    totalDrop += b0 - b1;
    totalMs += dt;
  }

  if (totalMs < 60_000 || totalDrop < 1) return null;

  const usdtPerMs = totalDrop / totalMs;
  const need = currentBalance - minBalance;
  const msToHit = need / usdtPerMs;
  return msToHit / 3_600_000;
}
