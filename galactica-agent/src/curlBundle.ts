/** Copy-paste shell pack for judges / integrators. */
export function buildCurlBundle(baseUrl: string): string {
  const b = baseUrl.replace(/\/$/, "");
  const lines = [
    "# StablePilot — quick curl pack",
    `# Base: ${b}`,
    "",
    `curl -sS "${b}/health" | jq .`,
    `curl -sS "${b}/insights/stability-index" | jq .`,
    `curl -sS "${b}/policy/matrix" | jq .`,
    `curl -sS "${b}/briefing/judge" | jq .`,
    `curl -sS -X POST "${b}/agent/preview" -H "Content-Type: application/json" -d "{\\"balance\\":250}" | jq .`,
    `curl -sS -X POST "${b}/agent/run" | jq .`,
    ""
  ];
  return lines.join("\n");
}
