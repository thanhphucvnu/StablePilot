import type { AgentRunRecord } from "./types";

function utcDayKey(iso: string): string | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

/** Consecutive UTC days (from today backward) that have at least one run. */
export function buildActivityStreak(rows: AgentRunRecord[]): {
  currentStreakDays: number;
  bestStreakDays: number;
  lastActiveDay: string | null;
} {
  const days = new Set<string>();
  for (const r of rows) {
    const k = utcDayKey(r.at);
    if (k) days.add(k);
  }
  if (days.size === 0) {
    return { currentStreakDays: 0, bestStreakDays: 0, lastActiveDay: null };
  }

  const sorted = [...days].sort();
  const lastActiveDay = sorted[sorted.length - 1] ?? null;

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev === null) {
      run = 1;
    } else {
      const a = Date.parse(`${prev}T12:00:00Z`);
      const b = Date.parse(`${d}T12:00:00Z`);
      const diffDays = Math.round((b - a) / 86_400_000);
      run = diffDays === 1 ? run + 1 : 1;
    }
    best = Math.max(best, run);
    prev = d;
  }

  const today = new Date().toISOString().slice(0, 10);
  let current = 0;
  let d = new Date(`${today}T12:00:00Z`);
  while (days.has(d.toISOString().slice(0, 10))) {
    current += 1;
    d = new Date(d.getTime() - 86_400_000);
  }

  return { currentStreakDays: current, bestStreakDays: best, lastActiveDay };
}
