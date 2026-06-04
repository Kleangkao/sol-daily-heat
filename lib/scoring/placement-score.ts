import type { ScoreBreakdown } from "@/lib/types/db";

export type PlacementFlags = {
  boostOnly: boolean;
  isEligibleEditorial: boolean;
  hasFreshOfficial: boolean;
  isMicroFeeSpike: boolean;
  isHeadlineOnly?: boolean;
  isStatusTopic?: boolean;
  isPreferredStatus?: boolean;
  isSevereStatus?: boolean;
};

/** Sort key for top_heat curation (higher = preferred). */
export function computePlacementSortScore(
  heatScore: number,
  breakdown: ScoreBreakdown,
  flags: PlacementFlags
): number {
  let score = heatScore;

  if (flags.isEligibleEditorial) {
    score += flags.isHeadlineOnly ? 4 : 14;
  }
  if (flags.hasFreshOfficial && !flags.isHeadlineOnly) score += 10;
  if (breakdown.official_source_bonus && !flags.isHeadlineOnly) score += 6;
  if (breakdown.editorial_confirmation && !flags.isHeadlineOnly) score += 8;
  if (flags.isHeadlineOnly) score -= 6;
  if (breakdown.cross_type_corroboration) score += 6;

  if (flags.boostOnly) score -= 18;
  if (flags.isMicroFeeSpike) score -= 12;
  if ((breakdown.fee_small_base_discount ?? 0) < 0) score -= 6;

  if (flags.isStatusTopic) {
    score += 8;
    if (flags.isPreferredStatus) score += 10;
    if (flags.isSevereStatus) score += 6;
  }

  return score;
}
