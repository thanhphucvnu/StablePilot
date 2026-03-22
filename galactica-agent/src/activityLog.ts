export type ActivityKind =
  | "run"
  | "proposal"
  | "approved"
  | "rejected"
  | "blocked"
  | "loop_start"
  | "loop_stop"
  | "autonomy"
  | "lab"
  | "safety"
  | "ops";

export interface ActivityItem {
  at: string;
  kind: ActivityKind;
  title: string;
  detail: string;
}

const MAX = 120;
const buffer: ActivityItem[] = [];
const listeners = new Set<(item: ActivityItem) => void>();

export function subscribeActivity(listener: (item: ActivityItem) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function pushActivity(
  kind: ActivityKind,
  title: string,
  detail: string,
  at = new Date().toISOString()
): void {
  const item: ActivityItem = { at, kind, title, detail };
  buffer.unshift(item);
  buffer.splice(MAX);
  for (const fn of listeners) {
    try {
      fn(item);
    } catch (err) {
      console.error("Activity listener error:", err);
    }
  }
}
export function getActivityFeed(): ActivityItem[] {
  return [...buffer];
}

export function clearActivityFeed(): void {
  buffer.length = 0;
}
