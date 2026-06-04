/** DefiLlama fees ingest + heat-score thresholds (USD). */
export const FEE_MIN_24H_USD = 25_000;
export const FEE_HIGH_24H_USD = 100_000;
export const MAX_SCORED_FEE_PCT = 200;
export const CHAIN_FEE_MIN_24H_USD = 1_000_000;

export type FeesEvalResult = {
  ingest: boolean;
  scoredChangePct: number;
  feeThresholdPassed: boolean;
  feeSmallBaseDiscount: number;
  feePriority: number;
};

export function evaluateProtocolFees(
  total24h: number | undefined,
  change1d: number | undefined
): FeesEvalResult {
  const total = total24h ?? 0;
  const rawChange = change1d ?? 0;
  const absChange = Math.abs(rawChange);

  if (total < FEE_MIN_24H_USD) {
    return {
      ingest: false,
      scoredChangePct: rawChange,
      feeThresholdPassed: false,
      feeSmallBaseDiscount: 0,
      feePriority: 0,
    };
  }

  const smallBase = total < FEE_HIGH_24H_USD && absChange > MAX_SCORED_FEE_PCT;
  const scoredChangePct = smallBase
    ? Math.sign(rawChange) * MAX_SCORED_FEE_PCT
    : rawChange;
  const feeSmallBaseDiscount = smallBase ? -10 : 0;
  const feePriority = total * (Math.abs(scoredChangePct) / 100);

  return {
    ingest: true,
    scoredChangePct,
    feeThresholdPassed: true,
    feeSmallBaseDiscount,
    feePriority,
  };
}

export function evaluateChainFees(
  total24h: number | undefined,
  change1d: number | undefined
): FeesEvalResult {
  const total = total24h ?? 0;
  const rawChange = change1d ?? 0;
  if (total < CHAIN_FEE_MIN_24H_USD && Math.abs(rawChange) < 3) {
    return {
      ingest: false,
      scoredChangePct: rawChange,
      feeThresholdPassed: false,
      feeSmallBaseDiscount: 0,
      feePriority: 0,
    };
  }

  const absChange = Math.abs(rawChange);
  const scoredChangePct =
    absChange > MAX_SCORED_FEE_PCT ? Math.sign(rawChange) * MAX_SCORED_FEE_PCT : rawChange;

  return {
    ingest: true,
    scoredChangePct,
    feeThresholdPassed: true,
    feeSmallBaseDiscount: 0,
    feePriority: total * (Math.abs(scoredChangePct) / 100),
  };
}
