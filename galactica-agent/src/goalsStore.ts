let treasuryGoalUsdt: number | null = null;
let treasuryGoalLabel = "";

export function getTreasuryGoal(): { targetUsdt: number | null; label: string } {
  return {
    targetUsdt: treasuryGoalUsdt,
    label: treasuryGoalLabel
  };
}

export function getTreasuryGoalWithProgress(
  currentBalance: number,
  effectiveTarget: number
): { targetUsdt: number | null; label: string; progressPercent: number | null } {
  return {
    ...getTreasuryGoal(),
    progressPercent: goalProgress(currentBalance, effectiveTarget)
  };
}

export function setTreasuryGoal(targetUsdt: number | null, label?: string): void {
  if (targetUsdt === null || targetUsdt === undefined) {
    treasuryGoalUsdt = null;
    treasuryGoalLabel = "";
    return;
  }
  treasuryGoalUsdt = Math.max(0, Math.round(targetUsdt));
  treasuryGoalLabel = typeof label === "string" ? label.slice(0, 120) : "";
}

export function goalProgress(currentBalance: number, effectiveTarget: number): number | null {
  if (treasuryGoalUsdt == null || treasuryGoalUsdt <= 0) return null;
  const base = Math.min(currentBalance, effectiveTarget);
  const span = treasuryGoalUsdt - effectiveTarget;
  if (span <= 0) return null;
  const p = ((currentBalance - effectiveTarget) / span) * 100;
  return Math.round(Math.min(100, Math.max(0, p)) * 10) / 10;
}
