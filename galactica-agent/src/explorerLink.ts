import { config } from "./config";

/** When template is set (e.g. https://sepolia.etherscan.io/tx/{{txId}}), link real hashes only. */
export function explorerUrlForTx(txId: string): string | null {
  const tmpl = config.blockExplorerTxUrlTemplate.trim();
  if (!tmpl || !txId) return null;
  if (txId.startsWith("sim_")) return null;
  if (!/^0x[a-fA-F0-9]{8,128}$/.test(txId)) return null;
  return tmpl.replace(/\{\{txId\}\}/g, txId).replace(/\{\{txHash\}\}/g, txId);
}
