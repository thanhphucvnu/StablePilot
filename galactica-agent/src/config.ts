import dotenv from "dotenv";
import type { AutonomyModeName, PolicyPresetName } from "./types";

dotenv.config();

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function parsePreset(raw: string | undefined): PolicyPresetName {
  const v = (raw ?? "balanced").toLowerCase();
  if (v === "conservative" || v === "aggressive") return v;
  return "balanced";
}

function parseAutonomy(raw: string | undefined): AutonomyModeName {
  const v = (raw ?? "autonomous").toLowerCase();
  return v === "approval" ? "approval" : "autonomous";
}

export const config = {
  /** Bind address (0.0.0.0 for Docker / cloud / tunnels; override with HOST). */
  host: process.env.HOST ?? "0.0.0.0",
  port: numberFromEnv("PORT", 8080),
  runIntervalMs: numberFromEnv("RUN_INTERVAL_MS", 15000),
  simulationMode: (process.env.SIMULATION_MODE ?? "true").toLowerCase() === "true",
  wdkApiBaseUrl: process.env.WDK_API_BASE_URL ?? "",
  wdkApiKey: process.env.WDK_API_KEY ?? "",
  wdkWalletId: process.env.WDK_WALLET_ID ?? "wallet_demo",
  /** Optional read-only second wallet for dual-vault dashboards (same WDK API). */
  wdkSecondaryWalletId: process.env.WDK_SECONDARY_WALLET_ID ?? "",
  simSecondaryUsdtBalance: numberFromEnv("SIM_SECONDARY_USDT_BALANCE", 5000),
  minUsdtBalance: numberFromEnv("MIN_USDT_BALANCE", 200),
  targetUsdtBalance: numberFromEnv("TARGET_USDT_BALANCE", 500),
  maxTxAmount: numberFromEnv("MAX_TX_AMOUNT", 100),
  transferCooldownMs: numberFromEnv("TRANSFER_COOLDOWN_MS", 60_000),
  webhookUrl: process.env.WEBHOOK_URL ?? "",
  /** When set, emitWebhook adds X-StablePilot-Signature: sha256=<hex> over raw JSON body. */
  webhookHmacSecret: process.env.WEBHOOK_HMAC_SECRET ?? "",
  policyPreset: parsePreset(process.env.POLICY_PRESET),
  autonomyMode: parseAutonomy(process.env.AUTONOMY_MODE),
  governanceStrict: (process.env.GOVERNANCE_STRICT ?? "false").toLowerCase() === "true",
  governanceZThreshold: numberFromEnv("GOVERNANCE_Z_THRESHOLD", 2.5),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  explainModel: process.env.EXPLAIN_MODEL ?? "gpt-4o-mini",
  /** 0 = unlimited daily outbound USDT (sim + WDK) */
  dailyUsdtTransferCap: numberFromEnv("DAILY_USDT_TRANSFER_CAP", 0),
  auditSigningSecret: process.env.AUDIT_SIGNING_SECRET ?? "",
  /** e.g. https://sepolia.etherscan.io/tx/{{txId}} */
  blockExplorerTxUrlTemplate: process.env.BLOCK_EXPLORER_TX_URL_TEMPLATE ?? "",
  opsToken: process.env.OPS_TOKEN ?? "",
  enableCors: (process.env.ENABLE_CORS ?? "false").toLowerCase() === "true",
  corsOrigin: process.env.CORS_ORIGIN ?? "*"
};