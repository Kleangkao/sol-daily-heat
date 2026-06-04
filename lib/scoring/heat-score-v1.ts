import type { ScoreBreakdown } from "@/lib/types/db";
import { solanaKeywordScore } from "@/lib/text/keywords";

export type HeatScoreInput = {
  sourceCount: number;
  newestPublishedAt: string | null;
  reliabilityAvg: number;
  textBlob: string;
  hasMarketSignal: boolean;
  hasProtocolSignal: boolean;
  isNovelToday: boolean;
  sourceSlugs: string[];
  freshEditorialRssSlugs: string[];
  hasEditorialSignal: boolean;
  uniqueSignals: string[];
  boostOnly: boolean;
  hasFreshOfficial: boolean;
  hasOfficialWithin30d?: boolean;
  feeThresholdPassed?: boolean;
  feeSmallBaseDiscount?: number;
};

function sumBreakdown(breakdown: ScoreBreakdown): number {
  return Math.min(
    100,
    Math.max(
      0,
      Object.values(breakdown).reduce<number>((a, b) => a + (b ?? 0), 0)
    )
  );
}

export function computeHeatScore(input: HeatScoreInput): {
  heat_score: number;
  score_breakdown_json: ScoreBreakdown;
  confidence_score: number;
} {
  const breakdown: ScoreBreakdown = {};

  if (input.sourceCount >= 3) breakdown.source_diversity = 25;
  else if (input.sourceCount === 2) breakdown.source_diversity = 12;
  else breakdown.source_diversity = 5;

  if (input.newestPublishedAt) {
    const ageH = (Date.now() - new Date(input.newestPublishedAt).getTime()) / 3600000;
    if (ageH < 2) breakdown.recency = 20;
    else if (ageH < 6) breakdown.recency = 12;
    else if (ageH < 24) breakdown.recency = 6;
    else if (ageH < 48) breakdown.recency = 4;
    else if (ageH < 72) breakdown.recency = 2;
    else if (ageH < 168) breakdown.recency = 1;
    else if (ageH < 720) breakdown.recency = 1;
    else breakdown.recency = 0;
  } else {
    breakdown.recency = 4;
  }

  let market = 0;
  if (input.hasMarketSignal) market += 18;
  if (input.hasProtocolSignal) market += 12;

  if (input.boostOnly) {
    market = Math.min(market, 6);
    breakdown.boost_only_cap = 6;
    breakdown.boost_top_heat_penalty = -12;
  }

  breakdown.volume_signal = Math.min(30, market);

  breakdown.keyword_match = solanaKeywordScore(input.textBlob);
  breakdown.reliability_weight = Math.round(input.reliabilityAvg * 15);

  if (input.hasFreshOfficial) {
    breakdown.official_source_bonus = 12;
  } else if (input.hasOfficialWithin30d) {
    breakdown.official_source_bonus = 16;
  }

  if (input.freshEditorialRssSlugs.length >= 2) {
    breakdown.editorial_confirmation = 12;
  }

  if (
    input.hasEditorialSignal &&
    (input.hasMarketSignal || input.hasProtocolSignal)
  ) {
    breakdown.cross_type_corroboration = 10;
  }

  if (input.feeThresholdPassed) {
    breakdown.fee_threshold_passed = 1;
  }
  if (input.feeSmallBaseDiscount && input.feeSmallBaseDiscount < 0) {
    breakdown.fee_small_base_discount = input.feeSmallBaseDiscount;
  }

  if (input.isNovelToday) breakdown.novelty = 10;

  const heat_score = sumBreakdown(breakdown);

  const confidence_score = Math.min(
    1,
    0.35 +
      input.sourceCount * 0.1 +
      input.reliabilityAvg * 0.25 +
      (input.hasMarketSignal || input.hasProtocolSignal ? 0.15 : 0) +
      (input.freshEditorialRssSlugs.length >= 2 ? 0.08 : 0) +
      (input.hasFreshOfficial ? 0.06 : 0)
  );

  return { heat_score, score_breakdown_json: breakdown, confidence_score };
}
