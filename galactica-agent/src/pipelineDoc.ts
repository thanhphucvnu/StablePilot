import type { PipelineLayerId } from "./types";

export function buildPipelineDocumentation(): {
  title: string;
  layers: { id: PipelineLayerId; name: string; responsibility: string }[];
} {
  return {
    title: "StablePilot governance pipeline",
    layers: [
      {
        id: "rules",
        name: "Policy rules",
        responsibility: "Compare USDT balance against effective min/target/max and emit a deterministic action."
      },
      {
        id: "statistics",
        name: "Drift statistics",
        responsibility: "Compute mean and standard deviation of recent balance deltas; derive z-score for anomaly context."
      },
      {
        id: "council",
        name: "Council narrative",
        responsibility: "Assemble a human-readable rationale from pipeline step outcomes (no invented numbers)."
      },
      {
        id: "execution",
        name: "Execution gate",
        responsibility: "Apply strict z-gate, approval queue, cooldown, budget cap, circuit breaker, then WDK transfer."
      }
    ]
  };
}
