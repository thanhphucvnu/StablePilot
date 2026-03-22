import { pushActivity } from "./activityLog";

let frozen = false;

export function isMaintenanceFrozen(): boolean {
  return frozen;
}

export function setMaintenanceFrozen(value: boolean): boolean {
  frozen = value;
  pushActivity(
    "ops",
    "Maintenance mode",
    value ? "FROZEN — agent runs are no-ops for transfers" : "Resumed — normal governance applies"
  );
  return frozen;
}
