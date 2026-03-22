import { config } from "../config";
import { TransferResult, WalletSnapshot } from "../types";

let simulatedBalance = 120;

const SNAPSHOT_RING_MAX = 40;
const snapshotRing: WalletSnapshot[] = [];

function pushSnapshotRing(s: WalletSnapshot): void {
  snapshotRing.unshift({ ...s });
  if (snapshotRing.length > SNAPSHOT_RING_MAX) snapshotRing.length = SNAPSHOT_RING_MAX;
}

export function getRecentWalletSnapshots(): WalletSnapshot[] {
  return snapshotRing.map((x) => ({ ...x }));
}

export function setSimulatedBalance(value: number): void {
  if (Number.isFinite(value) && value >= 0) {
    simulatedBalance = value;
  }
}

export function getSimulatedBalance(): number {
  return simulatedBalance;
}

function assertWdkConfig(): void {
  if (!config.wdkApiBaseUrl || !config.wdkApiKey) {
    throw new Error("WDK_API_BASE_URL and WDK_API_KEY are required in non-simulation mode.");
  }
}

export async function getSecondaryWalletSnapshot(): Promise<WalletSnapshot | null> {
  const wid = config.wdkSecondaryWalletId?.trim();
  if (!wid) return null;
  if (config.simulationMode) {
    return {
      walletId: wid,
      usdtBalance: config.simSecondaryUsdtBalance,
      updatedAt: new Date().toISOString()
    };
  }
  assertWdkConfig();
  const response = await fetch(`${config.wdkApiBaseUrl}/wallets/${wid}/balances`, {
    headers: { Authorization: `Bearer ${config.wdkApiKey}` }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch secondary wallet balance: ${response.status}`);
  }
  const data = (await response.json()) as { usdtBalance: number };
  return {
    walletId: wid,
    usdtBalance: data.usdtBalance,
    updatedAt: new Date().toISOString()
  };
}

export async function getAllWalletSnapshots(): Promise<{
  primary: WalletSnapshot;
  secondary: WalletSnapshot | null;
}> {
  const primary = await getWalletSnapshot();
  const secondary = await getSecondaryWalletSnapshot();
  return { primary, secondary };
}

export async function getWalletSnapshot(): Promise<WalletSnapshot> {
  if (config.simulationMode) {
    const snap: WalletSnapshot = {
      walletId: config.wdkWalletId,
      usdtBalance: simulatedBalance,
      updatedAt: new Date().toISOString()
    };
    pushSnapshotRing(snap);
    return snap;
  }

  assertWdkConfig();
  const response = await fetch(`${config.wdkApiBaseUrl}/wallets/${config.wdkWalletId}/balances`, {
    headers: { Authorization: `Bearer ${config.wdkApiKey}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch wallet balance from WDK API: ${response.status}`);
  }

  const data = (await response.json()) as { usdtBalance: number };
  const snap: WalletSnapshot = {
    walletId: config.wdkWalletId,
    usdtBalance: data.usdtBalance,
    updatedAt: new Date().toISOString()
  };
  pushSnapshotRing(snap);
  return snap;
}

export async function transferUsdtToTreasury(amount: number): Promise<TransferResult> {
  if (config.simulationMode) {
    simulatedBalance += amount;
    return {
      txId: `sim_tx_${Date.now()}`,
      success: true,
      message: `Simulation transfer successful: +${amount} USDT`
    };
  }

  assertWdkConfig();
  const response = await fetch(`${config.wdkApiBaseUrl}/wallets/${config.wdkWalletId}/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.wdkApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      asset: "USDT",
      amount,
      direction: "IN"
    })
  });

  if (!response.ok) {
    return {
      txId: "",
      success: false,
      message: `WDK transfer failed with status ${response.status}`
    };
  }

  const data = (await response.json()) as { txId: string; message?: string };
  return {
    txId: data.txId,
    success: true,
    message: data.message ?? "Transfer successful."
  };
}
