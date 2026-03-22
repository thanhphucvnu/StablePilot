/** Simple runway if a constant daily burn (USDT) continues. */
export function buildRunwayWhatIf(
  balanceUsdt: number,
  effectiveMinUsdt: number,
  burnPerDay: number
): {
  burnPerDay: number;
  cushionUsdt: number;
  daysToMin: number | null;
  narrative: string;
} {
  const cushionUsdt = balanceUsdt - effectiveMinUsdt;
  if (burnPerDay <= 0) {
    return {
      burnPerDay,
      cushionUsdt,
      daysToMin: null,
      narrative:
        burnPerDay === 0
          ? "Zero burn — runway undefined (infinite in this model)."
          : "Negative burn implies inflows; runway not modeled here."
    };
  }
  if (cushionUsdt <= 0) {
    return {
      burnPerDay,
      cushionUsdt,
      daysToMin: 0,
      narrative: "Already at or below effective floor — runway exhausted in this model."
    };
  }
  const daysToMin = cushionUsdt / burnPerDay;
  return {
    burnPerDay,
    cushionUsdt,
    daysToMin: Math.round(daysToMin * 10) / 10,
    narrative: `At ${burnPerDay} USDT/day burn, cushion to min is ~${daysToMin.toFixed(1)} days (linear model).`
  };
}
