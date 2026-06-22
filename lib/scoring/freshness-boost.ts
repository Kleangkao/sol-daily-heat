/**
 * Extra ranking boost for recent stories — applied at curation / rank_position sort time.
 * Strongest in the first 24h, decays through 72h, then zero (avoids old headlines dominating forever).
 */
export const FRESHNESS_BOOST_MAX = 22;
export const FRESHNESS_BOOST_STRONG_HOURS = 24;
export const FRESHNESS_BOOST_ZERO_HOURS = 72;

export function computeFreshnessBoost(storyAtIso: string | null | undefined): number {
  if (!storyAtIso) return 0;
  const ms = new Date(storyAtIso).getTime();
  if (Number.isNaN(ms)) return 0;

  const ageH = (Date.now() - ms) / 3600000;
  if (ageH < 0) return FRESHNESS_BOOST_MAX;

  if (ageH <= FRESHNESS_BOOST_STRONG_HOURS) {
    // 22 at publish → ~11 at 24h
    return FRESHNESS_BOOST_MAX * (1 - (ageH / FRESHNESS_BOOST_STRONG_HOURS) * 0.5);
  }

  if (ageH <= FRESHNESS_BOOST_ZERO_HOURS) {
    const t =
      (ageH - FRESHNESS_BOOST_STRONG_HOURS) /
      (FRESHNESS_BOOST_ZERO_HOURS - FRESHNESS_BOOST_STRONG_HOURS);
    const atStrongWindowEnd = FRESHNESS_BOOST_MAX * 0.5;
    return atStrongWindowEnd * (1 - t);
  }

  return 0;
}

/** heat_score + optional placement bonus + freshness boost (not capped at 100). */
export function computeAdjustedRankScore(
  heatScore: number,
  storyAtIso: string | null | undefined,
  placementBonus = 0
): number {
  return heatScore + placementBonus + computeFreshnessBoost(storyAtIso);
}
