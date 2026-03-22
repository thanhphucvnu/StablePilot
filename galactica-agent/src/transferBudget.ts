import fs from "fs";
import path from "path";

const stateFile = path.join(process.cwd(), "data", "transfer-budget.json");

interface BudgetState {
  utcDay: string;
  spentUsdt: number;
}

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): BudgetState {
  try {
    const raw = JSON.parse(fs.readFileSync(stateFile, "utf8")) as BudgetState;
    if (raw.utcDay !== utcDayKey()) {
      return { utcDay: utcDayKey(), spentUsdt: 0 };
    }
    return {
      utcDay: raw.utcDay,
      spentUsdt: Number.isFinite(raw.spentUsdt) ? raw.spentUsdt : 0
    };
  } catch {
    return { utcDay: utcDayKey(), spentUsdt: 0 };
  }
}

let state = loadState();

function persist(): void {
  const dir = path.dirname(stateFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf-8");
}

function rollDayIfNeeded(): void {
  const today = utcDayKey();
  if (state.utcDay !== today) {
    state = { utcDay: today, spentUsdt: 0 };
    persist();
  }
}

export function canSpend(amount: number, dailyCap: number): { ok: boolean; remaining: number } {
  if (dailyCap <= 0) {
    return { ok: true, remaining: Number.POSITIVE_INFINITY };
  }
  rollDayIfNeeded();
  const remaining = dailyCap - state.spentUsdt;
  return { ok: amount <= remaining, remaining: Math.max(0, remaining) };
}

export function recordSpend(amount: number, dailyCap: number): void {
  if (dailyCap <= 0 || amount <= 0) return;
  rollDayIfNeeded();
  state.spentUsdt += amount;
  persist();
}

export function getBudgetStatus(dailyCap: number): {
  utcDay: string;
  spentUsdt: number;
  cap: number | null;
  remaining: number | null;
} {
  rollDayIfNeeded();
  if (dailyCap <= 0) {
    return { utcDay: state.utcDay, spentUsdt: state.spentUsdt, cap: null, remaining: null };
  }
  return {
    utcDay: state.utcDay,
    spentUsdt: state.spentUsdt,
    cap: dailyCap,
    remaining: Math.max(0, dailyCap - state.spentUsdt)
  };
}

/** Demo / ops: zero today’s counter without waiting for UTC midnight. */
export function resetDailySpendCounter(): void {
  state = { utcDay: utcDayKey(), spentUsdt: 0 };
  persist();
}
