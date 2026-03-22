import { pushActivity } from "./activityLog";
import { getSimulatedBalance, setSimulatedBalance } from "./integrations/wdkClient";

export type ShockKind = "flash_drop" | "sudden_inflow" | "drain_small";

export function applySimulationShock(kind: ShockKind, magnitude: number): { before: number; after: number } {
  const before = getSimulatedBalance();
  let after = before;

  if (kind === "flash_drop") {
    const pct = Math.min(95, Math.max(1, magnitude || 30));
    after = Math.max(0, before * (1 - pct / 100));
    setSimulatedBalance(after);
    pushActivity("lab", "Stress lab", `flash_drop ${pct}% · ${before} → ${after} USDT`);
  } else if (kind === "sudden_inflow") {
    const add = Math.max(0, magnitude || 250);
    after = before + add;
    setSimulatedBalance(after);
    pushActivity("lab", "Stress lab", `sudden_inflow +${add} USDT`);
  } else if (kind === "drain_small") {
    const sub = Math.max(0, Math.min(before, magnitude || 40));
    after = before - sub;
    setSimulatedBalance(after);
    pushActivity("lab", "Stress lab", `drain_small -${sub} USDT`);
  }

  return { before, after };
}

export function applyScenarioChain(
  steps: { kind: ShockKind; magnitude: number }[]
): {
  initialBalance: number;
  finalBalance: number;
  steps: { kind: ShockKind; magnitude: number; balanceAfter: number }[];
} {
  const trace: { kind: ShockKind; magnitude: number; balanceAfter: number }[] = [];
  const initialBalance = getSimulatedBalance();
  for (const step of steps) {
    const { after } = applySimulationShock(step.kind, step.magnitude);
    trace.push({ kind: step.kind, magnitude: step.magnitude, balanceAfter: after });
  }
  return {
    initialBalance,
    finalBalance: getSimulatedBalance(),
    steps: trace
  };
}
