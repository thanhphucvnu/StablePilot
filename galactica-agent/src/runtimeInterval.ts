import { config } from "./config";

const MIN_MS = 3_000;
const MAX_MS = 3_600_000;

let overrideMs: number | null = null;

export function getEffectiveRunIntervalMs(): number {
  const base = overrideMs ?? config.runIntervalMs;
  return Math.min(MAX_MS, Math.max(MIN_MS, Math.floor(base)));
}

/** null clears override and restores .env default. */
export function setRunIntervalOverrideMs(ms: number | null): number {
  if (ms === null) {
    overrideMs = null;
    return getEffectiveRunIntervalMs();
  }
  overrideMs = Math.min(MAX_MS, Math.max(MIN_MS, Math.floor(ms)));
  return getEffectiveRunIntervalMs();
}

export function getRunIntervalOverrideMs(): number | null {
  return overrideMs;
}
