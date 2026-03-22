import fs from "fs";
import path from "path";
import { AgentRunRecord } from "./types";

const dataDir = path.join(process.cwd(), "data");
const historyFile = path.join(dataDir, "agent-history.json");
const MAX_RECORDS = 500;

function ensureDataDir(): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function loadPersistedHistory(): AgentRunRecord[] {
  try {
    const raw = fs.readFileSync(historyFile, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AgentRunRecord[]) : [];
  } catch {
    return [];
  }
}

export function persistHistory(records: AgentRunRecord[]): void {
  ensureDataDir();
  const trimmed = records.slice(-MAX_RECORDS);
  fs.writeFileSync(historyFile, JSON.stringify(trimmed, null, 2), "utf-8");
}
