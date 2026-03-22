/** Named one-shot balances for demos — simulation mode only. */
export const SIMULATION_SCENARIO_PRESETS: Record<string, number> = {
  demo_healthy: 480,
  demo_stressed: 95,
  demo_balanced: 320,
  demo_overflow: 1200,
  demo_min_edge: 205,
  demo_target_hit: 500,
  demo_micro: 50,
  demo_whale: 250_000,
  demo_flat: 400,
  demo_dip: 180,
  demo_recovery: 420,
  demo_stress_test: 88,
  demo_boardroom: 9999
};

export function listSimulationPresetNames(): string[] {
  return Object.keys(SIMULATION_SCENARIO_PRESETS).sort();
}
