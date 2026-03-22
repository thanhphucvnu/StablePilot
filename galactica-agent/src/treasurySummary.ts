import { getAutonomyMode, getCooldownRemainingMs, getFullHistoryForMetrics, getLastTransferAt, listPending } from "./agent";
import { isCircuitOpen } from "./circuitBreaker";
import { config } from "./config";
import { buildTreasuryHealth } from "./health";
import { isMaintenanceFrozen } from "./maintenance";
import { getWalletSnapshot } from "./integrations/wdkClient";
import { getBudgetStatus } from "./transferBudget";
import { getEffectiveRunIntervalMs, getRunIntervalOverrideMs } from "./runtimeInterval";

export async function buildTreasurySummary(loopRunning: boolean): Promise<Record<string, unknown>> {
  const snapshot = await getWalletSnapshot();
  const history = getFullHistoryForMetrics();
  const health = buildTreasuryHealth(
    snapshot.usdtBalance,
    history,
    getCooldownRemainingMs(),
    getLastTransferAt()
  );
  return {
    at: new Date().toISOString(),
    simulationMode: config.simulationMode,
    wallet: snapshot,
    treasuryHealth: health,
    safety: {
      circuitOpen: isCircuitOpen(),
      maintenanceFrozen: isMaintenanceFrozen(),
      budget: getBudgetStatus(config.dailyUsdtTransferCap)
    },
    governance: {
      autonomyMode: getAutonomyMode(),
      governanceStrict: config.governanceStrict,
      governanceZThreshold: config.governanceZThreshold,
      openApprovals: listPending().length
    },
    agentLoop: {
      running: loopRunning,
      effectiveIntervalMs: getEffectiveRunIntervalMs(),
      intervalOverrideMs: getRunIntervalOverrideMs(),
      envDefaultIntervalMs: config.runIntervalMs
    }
  };
}
