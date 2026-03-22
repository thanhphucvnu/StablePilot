import { config } from "./config";
import type { AgentRunRecord } from "./types";

/**
 * Optional executive paraphrase — LLM must not invent numbers; only restates deterministic record.
 */
export async function explainRunForJudges(record: AgentRunRecord): Promise<string | null> {
  const key = config.openaiApiKey?.trim();
  if (!key) return null;

  const facts = {
    runId: record.runId,
    outcome: record.outcome,
    beforeUsdt: record.beforeBalance,
    afterUsdt: record.afterBalance,
    shouldAct: record.decision.shouldAct,
    amount: record.decision.amount,
    zScore: record.stats?.zScore ?? null,
    narrative: record.narrative ?? ""
  };

  const body = {
    model: config.explainModel,
    messages: [
      {
        role: "system",
        content:
          "You are a treasury audit assistant. Reply in 2 short sentences in plain English. Use ONLY the numbers and outcomes in the JSON. If zScore is null, say statistics were warming up. Do not suggest trades or new amounts."
      },
      {
        role: "user",
        content: JSON.stringify(facts)
      }
    ],
    max_tokens: 120,
    temperature: 0.2
  };

  const url = `${config.openaiBaseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text ?? null;
}
