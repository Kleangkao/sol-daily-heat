/**
 * Heat decay — when a topic may appear on today's snapshot.
 * Uses rolling freshness windows (see FRESH_SIGNAL_HOURS), not calendar midnight.
 *
 * is_carryover: was top_heat yesterday + fresh raw in the rolling window.
 * Stale repeat: was top_heat yesterday + no fresh raw in the window → skip ranking.
 */

export function isStaleRepeat(
  clusteringKey: string,
  yesterdayTopHeatKeys: Set<string>,
  hasFreshRaw: boolean
): boolean {
  return yesterdayTopHeatKeys.has(clusteringKey) && !hasFreshRaw;
}

/** @deprecated Use isStaleRepeat — kept for clarity at call sites */
export function shouldExcludeCarryover(
  clusteringKey: string,
  yesterdayKeys: Set<string>,
  hasFreshRaw: boolean
): boolean {
  return isStaleRepeat(clusteringKey, yesterdayKeys, hasFreshRaw);
}

/**
 * True when the topic returns today after being hot yesterday, with fresh signals.
 * Persisted as daily_rankings.is_carryover; surfaced in UI as "Updated story".
 */
export function isUpdatedStoryCarryover(
  clusteringKey: string,
  yesterdayTopHeatKeys: Set<string>,
  hasFreshRaw: boolean
): boolean {
  return yesterdayTopHeatKeys.has(clusteringKey) && hasFreshRaw;
}
