import { readPackageVersion } from "./versionInfo";

export function buildChangelog(): {
  currentVersion: string;
  releases: { version: string; highlights: string[] }[];
} {
  return {
    currentVersion: readPackageVersion(),
    releases: [
      {
        version: readPackageVersion(),
        highlights: [
          "Treasury Stability Index + risk radar + engage badges",
          "Policy matrix, attestation chain, scenario-chain lab",
          "Dual-wallet telemetry, signed webhooks, 60+ HTTP routes",
          "Cinematic landing hero + playbook dashboard tab"
        ]
      },
      {
        version: "1.0.0-base",
        highlights: [
          "Four-layer pipeline, WDK wrapper, approval queue",
          "Audit bundle, SSE, circuit breaker, daily cap"
        ]
      }
    ]
  };
}
