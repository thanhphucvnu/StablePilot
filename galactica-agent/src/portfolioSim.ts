import { getSimulatedBalance } from "./integrations/wdkClient";

export interface SatelliteVault {
  id: string;
  label: string;
  usdtBalance: number;
}

/** Illustrative multi-vault view in simulation (agent still operates primary WDK wallet only). */
let satellites: SatelliteVault[] = [
  { id: "vault_ops", label: "Ops / payroll hot", usdtBalance: 340 },
  { id: "vault_reserve", label: "DAO strategic reserve", usdtBalance: 1850 }
];

export function getSatellites(): SatelliteVault[] {
  return satellites.map((s) => ({ ...s }));
}

export function setSatelliteBalance(id: string, balance: number): boolean {
  if (!Number.isFinite(balance) || balance < 0) return false;
  const row = satellites.find((s) => s.id === id);
  if (!row) return false;
  row.usdtBalance = balance;
  return true;
}

export function getPortfolioAggregate(primaryWalletId: string) {
  const primaryUsdt = getSimulatedBalance();
  const satTotal = satellites.reduce((a, s) => a + s.usdtBalance, 0);
  return {
    primaryWalletId,
    primaryUsdt,
    satellites: getSatellites(),
    aggregateUsdt: primaryUsdt + satTotal,
    note:
      "Simulation: satellites are an organizational view; the autonomous agent still reads/transfers the primary wallet via WDK. Production: map each id to real WDK walletIds."
  };
}
