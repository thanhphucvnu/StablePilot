import { createHmac } from "node:crypto";
import { config } from "./config";

export async function emitWebhook(
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const url = config.webhookUrl?.trim();
  if (!url) return;

  const bodyObj = {
    source: "stablepilot",
    event,
    at: new Date().toISOString(),
    ...payload
  };
  const body = JSON.stringify(bodyObj);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const whSecret = config.webhookHmacSecret?.trim();
  if (whSecret) {
    const sig = createHmac("sha256", whSecret).update(body, "utf8").digest("hex");
    headers["X-StablePilot-Signature"] = `sha256=${sig}`;
  }

  try {
    await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(8000)
    });
  } catch (error) {
    console.error("Webhook delivery failed:", error);
  }
}
