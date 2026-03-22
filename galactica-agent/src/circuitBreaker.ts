import fs from "fs";
import path from "path";

const stateFile = path.join(process.cwd(), "data", "circuit.json");

function readOpen(): boolean {
  try {
    const raw = JSON.parse(fs.readFileSync(stateFile, "utf8")) as { open?: boolean };
    return Boolean(raw.open);
  } catch {
    return false;
  }
}

let circuitOpen = readOpen();

export function isCircuitOpen(): boolean {
  return circuitOpen;
}

export function setCircuitOpen(open: boolean): void {
  circuitOpen = open;
  const dir = path.dirname(stateFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify({ open }, null, 2), "utf-8");
}
