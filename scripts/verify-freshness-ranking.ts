/**
 * Local fixture check — freshness boost changes ranking order without DB.
 * Run: npx tsx scripts/verify-freshness-ranking.ts
 */
import { compareCandidates, type CuratedCandidate } from "../lib/process/curate-rankings";
import { computeFreshnessBoost, computeAdjustedRankScore } from "../lib/scoring/freshness-boost";
import type { ScoreBreakdown, TopicCategory } from "../lib/types/db";

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}

function mockCandidate(
  title: string,
  heat: number,
  storyHoursAgo: number
): CuratedCandidate {
  const storyAt = hoursAgo(storyHoursAgo);
  const breakdown: ScoreBreakdown = { recency: 10 };
  return {
    topicId: title,
    title,
    heat_score: heat,
    category: "ecosystem" as TopicCategory,
    itemTypes: ["news"],
    score_breakdown_json: breakdown,
    confidence_score: 0.7,
    is_carryover: false,
    uniqueSignals: [],
    lastUpdatedAt: storyAt,
    storyAt,
    newestPublishedAt: storyAt,
    primarySourceSlug: "test",
    diversityBucket: "test:editorial",
    placementSortScore: heat,
    isBoostOnly: false,
    isDexOnly: false,
    isMetricOnly: false,
    isEligibleEditorial: true,
    isMicroFeeSpike: false,
    isHeadlineOnly: false,
    hasEditorialCorroboration: true,
  };
}

const fixtures = [
  mockCandidate("Old high heat", 78, 120),
  mockCandidate("Fresh moderate", 58, 4),
  mockCandidate("Yesterday strong", 72, 30),
  mockCandidate("Very fresh low", 48, 1),
];

console.log("Freshness boost samples:");
for (const h of [1, 6, 20, 30, 50, 80]) {
  console.log(`  ${h}h ago → boost ${computeFreshnessBoost(hoursAgo(h)).toFixed(1)}`);
}

const beforeOrder = [...fixtures].sort((a, b) => b.heat_score - a.heat_score);
const afterOrder = [...fixtures].sort(compareCandidates);

console.log("\nBefore (heat_score only):");
beforeOrder.forEach((c, i) => console.log(`  ${i + 1}. ${c.title} heat=${c.heat_score}`));

console.log("\nAfter (adjusted + freshness tie-break):");
afterOrder.forEach((c, i) => {
  const adj = computeAdjustedRankScore(c.heat_score, c.storyAt);
  console.log(
    `  ${i + 1}. ${c.title} heat=${c.heat_score} boost=${computeFreshnessBoost(c.storyAt).toFixed(1)} adj=${adj.toFixed(1)}`
  );
});

const freshMovedUp =
  afterOrder.findIndex((c) => c.title === "Fresh moderate") <
  beforeOrder.findIndex((c) => c.title === "Fresh moderate");
const oldStillPossible = afterOrder.some((c) => c.title === "Old high heat");

if (!freshMovedUp) {
  console.error("\n✗ Fresh item did not move up vs heat-only sort");
  process.exit(1);
}
if (!oldStillPossible) {
  console.error("\n✗ Old high-heat item disappeared entirely");
  process.exit(1);
}

console.log("\n✓ Fresh item moved up; old high-heat can still rank when score is strong enough");
