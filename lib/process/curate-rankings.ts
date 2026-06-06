import type { RankingSection, ScoreBreakdown, TopicCategory } from "@/lib/types/db";
import {
  GITHUB_RELEASE_SOURCE_SLUGS,
  PROJECT_OFFICIAL_BLOG_SLUGS,
  STATUS_PREFERRED_RANK_HOURS,
  STATUS_SOURCE_SLUGS,
} from "@/lib/sources/rss-ingest-policy";
import { isWithinHours } from "@/lib/scoring/freshness";
import { isSevereStatusTitle } from "@/lib/scoring/status-signals";
import { STATUS_MAX_AGE_HOURS } from "@/lib/scoring/topic-eligibility";
import {
  TOP_HEAT_MAX_HEADLINE_ONLY,
  CREATOR_MAX_HEADLINE_ONLY_STANDALONE,
  CREATOR_MAX_HEADLINE_ONLY_WITH_CORROBORATION,
  headlineOnlyInvestorRelevance,
} from "@/lib/sources/headline-only";
import { SITEMAP_DISCOVERY_SLUGS } from "@/lib/sources/sitemap-ingest-policy";
import {
  MAX_PER_ADAPTER_PER_SECTION,
  MAX_PER_DIVERSITY_BUCKET_PER_SECTION,
  SECTION_LIMITS,
} from "./section-limits";
import { curateBuilderWatch } from "./builder-watch";

export type CuratedCandidate = {
  topicId: string;
  title: string;
  heat_score: number;
  category: TopicCategory;
  itemTypes: string[];
  score_breakdown_json: ScoreBreakdown;
  confidence_score: number;
  is_carryover: boolean;
  uniqueSignals: string[];
  lastUpdatedAt: string;
  /** Best-effort source event time (reliability-weighted). */
  storyAt: string;
  newestPublishedAt: string | null;
  primarySourceSlug: string;
  diversityBucket: string;
  placementSortScore: number;
  isBoostOnly: boolean;
  isDexOnly: boolean;
  isMetricOnly: boolean;
  isEligibleEditorial: boolean;
  isMicroFeeSpike: boolean;
  isHeadlineOnly: boolean;
  hasEditorialCorroboration: boolean;
};

export type SectionCuration = Map<RankingSection, CuratedCandidate[]>;

const TOP_HEAT_MAX_BOOST_ONLY = 2;
const TOP_HEAT_MAX_DEX_ONLY = 4;
const TOP_HEAT_MAX_METRIC_ONLY = 5;
const TOP_HEAT_MIN_EDITORIAL = 2;
const TOP_HEAT_MAX_STATUS = 1;

const INVESTOR_MAX_METRIC_ONLY = 4;
const INVESTOR_MIN_STATUS = 1;
const INVESTOR_MIN_EDITORIAL = 1;
const INVESTOR_STATUS_HEAT_MIN = 35;
/** Full editorial investor context on official project blogs (aligned with creator official floor). */
const INVESTOR_EDITORIAL_OFFICIAL_HEAT_MIN = 48;
/** Full editorial investor context on non-official sources. */
const INVESTOR_EDITORIAL_HEAT_MIN = 50;
const INVESTOR_DEFAULT_HEAT_MIN = 50;

export function compareCandidates(a: CuratedCandidate, b: CuratedCandidate): number {
  const scoreDiff = b.heat_score - a.heat_score;
  if (scoreDiff !== 0) return scoreDiff;

  const confDiff = b.confidence_score - a.confidence_score;
  if (confDiff !== 0) return confDiff;

  return new Date(b.storyAt).getTime() - new Date(a.storyAt).getTime();
}

function comparePlacement(a: CuratedCandidate, b: CuratedCandidate): number {
  const diff = b.placementSortScore - a.placementSortScore;
  if (diff !== 0) return diff;
  return compareCandidates(a, b);
}

export function buildDiversityBucket(
  primarySourceSlug: string,
  itemTypes: string[],
  uniqueSignals: string[],
  clusteringKey: string
): string {
  const signal = uniqueSignals[0] ?? itemTypes[0] ?? "unknown";
  if (itemTypes.includes("market") || itemTypes.includes("protocol")) {
    if (clusteringKey.startsWith("market-mint-")) {
      return `${primarySourceSlug}:mint:${clusteringKey.slice(0, 48)}`;
    }
    if (clusteringKey.startsWith("protocol-")) {
      return `${primarySourceSlug}:${clusteringKey}`;
    }
    return `${primarySourceSlug}:${signal}`;
  }
  return `${primarySourceSlug}:editorial`;
}

export function isMarketOnlyBoost(c: CuratedCandidate): boolean {
  return c.isBoostOnly;
}

function isDexOnlyCandidate(c: CuratedCandidate): boolean {
  return c.isDexOnly;
}

function isMetricOnlyCandidate(c: CuratedCandidate): boolean {
  return c.isMetricOnly;
}

function isNewTokenTopic(c: CuratedCandidate): boolean {
  return c.itemTypes.includes("market");
}

function isDefiTopic(c: CuratedCandidate): boolean {
  return c.category === "defi" || c.itemTypes.includes("protocol");
}

function isHeadlineOnlyCandidate(c: CuratedCandidate): boolean {
  return c.isHeadlineOnly;
}

function isFullEditorialCandidate(c: CuratedCandidate): boolean {
  return (
    c.isEligibleEditorial &&
    !c.isHeadlineOnly &&
    !SITEMAP_DISCOVERY_SLUGS.has(c.primarySourceSlug)
  );
}

function headlineOnlyCreatorCap(c: CuratedCandidate): number {
  return c.hasEditorialCorroboration
    ? CREATOR_MAX_HEADLINE_ONLY_WITH_CORROBORATION
    : CREATOR_MAX_HEADLINE_ONLY_STANDALONE;
}

function qualifiesForCreator(c: CuratedCandidate): boolean {
  if (STATUS_SOURCE_SLUGS.has(c.primarySourceSlug)) return false;
  if (GITHUB_RELEASE_SOURCE_SLUGS.has(c.primarySourceSlug)) return false;
  if (isMarketOnlyBoost(c)) return false;
  if (c.isMicroFeeSpike) return false;
  const heatMin = PROJECT_OFFICIAL_BLOG_SLUGS.has(c.primarySourceSlug) ? 48 : 55;
  if (c.heat_score < heatMin) return false;
  const narrative =
    c.isEligibleEditorial ||
    c.itemTypes.includes("manual") ||
    ["ecosystem", "infra", "regulatory", "ai", "gaming", "nft"].includes(c.category);
  if (!narrative) return false;
  if (isMetricOnlyCandidate(c) && !c.isEligibleEditorial) return false;
  return true;
}

function isStatusTopic(c: CuratedCandidate): boolean {
  return STATUS_SOURCE_SLUGS.has(c.primarySourceSlug);
}

function isFreshStatusTopic(c: CuratedCandidate): boolean {
  return (
    isStatusTopic(c) &&
    c.newestPublishedAt != null &&
    isWithinHours(c.newestPublishedAt, STATUS_MAX_AGE_HOURS)
  );
}

function isPreferredStatusTopic(c: CuratedCandidate): boolean {
  return (
    isFreshStatusTopic(c) &&
    c.newestPublishedAt != null &&
    isWithinHours(c.newestPublishedAt, STATUS_PREFERRED_RANK_HOURS)
  );
}

function isSevereFreshStatus(c: CuratedCandidate): boolean {
  return isFreshStatusTopic(c) && (isSevereStatusTitle(c.title) || isPreferredStatusTopic(c));
}

function qualifiesForInvestorEditorialContext(c: CuratedCandidate): boolean {
  if (isMarketOnlyBoost(c) || isStatusTopic(c)) return false;
  if (!c.isEligibleEditorial) return false;
  if (
    isHeadlineOnlyCandidate(c) &&
    !headlineOnlyInvestorRelevance(c.title, c.category)
  ) {
    return false;
  }
  return (
    c.category === "defi" ||
    c.category === "infra" ||
    c.category === "regulatory" ||
    c.category === "ecosystem" ||
    c.itemTypes.includes("protocol") ||
    PROJECT_OFFICIAL_BLOG_SLUGS.has(c.primarySourceSlug)
  );
}

function isInvestorMetricOnly(c: CuratedCandidate): boolean {
  return (
    isMetricOnlyCandidate(c) &&
    !isStatusTopic(c) &&
    !qualifiesForInvestorEditorialContext(c)
  );
}

function investorQualificationHeatMin(c: CuratedCandidate): number {
  if (isStatusTopic(c)) return INVESTOR_STATUS_HEAT_MIN;
  if (qualifiesForInvestorEditorialContext(c)) {
    return PROJECT_OFFICIAL_BLOG_SLUGS.has(c.primarySourceSlug)
      ? INVESTOR_EDITORIAL_OFFICIAL_HEAT_MIN
      : INVESTOR_EDITORIAL_HEAT_MIN;
  }
  return INVESTOR_DEFAULT_HEAT_MIN;
}

/** Creator overlap allowed only for investor-relevant full editorial (not metric/boost dupes). */
function isBlockedFromInvestorByCreatorOverlap(
  c: CuratedCandidate,
  creatorIds: Set<string>
): boolean {
  if (!creatorIds.has(c.topicId)) return false;
  if (qualifiesForInvestorEditorialContext(c)) return false;
  return true;
}

function qualifiesForInvestor(c: CuratedCandidate): boolean {
  if (isMarketOnlyBoost(c)) return false;
  if (c.isMicroFeeSpike) return false;

  if (isStatusTopic(c)) {
    return isFreshStatusTopic(c) && c.heat_score >= INVESTOR_STATUS_HEAT_MIN;
  }

  if (c.heat_score < investorQualificationHeatMin(c)) return false;
  if (isDexOnlyCandidate(c) && !c.isEligibleEditorial) return false;

  return (
    qualifiesForInvestorEditorialContext(c) ||
    c.itemTypes.includes("protocol") ||
    c.category === "defi" ||
    c.itemTypes.includes("manual") ||
    ["ecosystem", "infra", "regulatory"].includes(c.category)
  );
}

function investorMetricSortScore(c: CuratedCandidate): number {
  let score = c.placementSortScore;
  if ((c.score_breakdown_json.fee_threshold_passed ?? 0) === 1) score += 4;
  if (c.confidence_score) score += Math.round(c.confidence_score * 8);
  return score;
}

function compareInvestorMetric(a: CuratedCandidate, b: CuratedCandidate): number {
  if (a.isMicroFeeSpike !== b.isMicroFeeSpike) return a.isMicroFeeSpike ? 1 : -1;
  const diff = investorMetricSortScore(b) - investorMetricSortScore(a);
  if (diff !== 0) return diff;
  return compareCandidates(a, b);
}

function compareInvestorStatus(a: CuratedCandidate, b: CuratedCandidate): number {
  const aPref = isPreferredStatusTopic(a) ? 1 : 0;
  const bPref = isPreferredStatusTopic(b) ? 1 : 0;
  if (bPref !== aPref) return bPref - aPref;
  const aSev = isSevereStatusTitle(a.title) ? 1 : 0;
  const bSev = isSevereStatusTitle(b.title) ? 1 : 0;
  if (bSev !== aSev) return bSev - aSev;
  const diff = b.placementSortScore - a.placementSortScore;
  if (diff !== 0) return diff;
  return compareCandidates(a, b);
}

function compareInvestorGeneral(a: CuratedCandidate, b: CuratedCandidate): number {
  const aEd = qualifiesForInvestorEditorialContext(a) ? 1 : 0;
  const bEd = qualifiesForInvestorEditorialContext(b) ? 1 : 0;
  if (bEd !== aEd) return bEd - aEd;
  const diff = b.placementSortScore - a.placementSortScore;
  if (diff !== 0) return diff;
  return compareCandidates(a, b);
}

function curateInvestorWatchlist(pool: CuratedCandidate[], limit: number): CuratedCandidate[] {
  const eligible = pool.filter(qualifiesForInvestor);
  const statusPool = eligible.filter(isFreshStatusTopic);
  const editorialPool = eligible.filter(qualifiesForInvestorEditorialContext);
  const metricPool = eligible.filter(isInvestorMetricOnly);

  const picked: CuratedCandidate[] = [];
  const pickedIds = new Set<string>();
  let metricOnly = 0;

  const tryPick = (c: CuratedCandidate): boolean => {
    if (pickedIds.has(c.topicId)) return false;
    if (isInvestorMetricOnly(c)) {
      if (metricOnly >= INVESTOR_MAX_METRIC_ONLY) return false;
      metricOnly += 1;
    }
    picked.push(c);
    pickedIds.add(c.topicId);
    return true;
  };

  const statusSorted = [...statusPool].sort(compareInvestorStatus);
  for (let i = 0; i < Math.min(INVESTOR_MIN_STATUS, statusSorted.length); i++) {
    if (picked.length >= limit) break;
    tryPick(statusSorted[i]);
  }

  const editorialSorted = [...editorialPool].sort(compareInvestorGeneral);
  const hasEditorial = () => picked.some(qualifiesForInvestorEditorialContext);
  for (const c of editorialSorted) {
    if (picked.length >= limit) break;
    if (hasEditorial()) break;
    tryPick(c);
  }

  for (const c of [...metricPool].sort(compareInvestorMetric)) {
    if (picked.length >= limit) break;
    tryPick(c);
  }

  for (const c of [...eligible].sort(compareInvestorGeneral)) {
    if (picked.length >= limit) break;
    tryPick(c);
  }

  return picked.sort(comparePlacement).slice(0, limit);
}

function curateSection(
  pool: CuratedCandidate[],
  limit: number,
  options?: {
    maxPerAdapter?: number;
    maxPerBucket?: number;
    compare?: (a: CuratedCandidate, b: CuratedCandidate) => number;
  }
): CuratedCandidate[] {
  const maxAdapter = options?.maxPerAdapter ?? MAX_PER_ADAPTER_PER_SECTION;
  const maxBucket = options?.maxPerBucket ?? MAX_PER_DIVERSITY_BUCKET_PER_SECTION;
  const compare = options?.compare ?? compareCandidates;
  const sorted = [...pool].sort(compare);
  const picked: CuratedCandidate[] = [];
  const adapterCounts = new Map<string, number>();
  const bucketCounts = new Map<string, number>();
  const pickedIds = new Set<string>();

  const tryPick = (c: CuratedCandidate, relaxBucketOnly: boolean): boolean => {
    if (pickedIds.has(c.topicId)) return false;
    const aCount = adapterCounts.get(c.primarySourceSlug) ?? 0;
    if (aCount >= maxAdapter) return false;
    if (!relaxBucketOnly) {
      const bCount = bucketCounts.get(c.diversityBucket) ?? 0;
      if (bCount >= maxBucket) return false;
    }
    picked.push(c);
    pickedIds.add(c.topicId);
    adapterCounts.set(c.primarySourceSlug, (adapterCounts.get(c.primarySourceSlug) ?? 0) + 1);
    bucketCounts.set(c.diversityBucket, (bucketCounts.get(c.diversityBucket) ?? 0) + 1);
    return true;
  };

  for (const c of sorted) {
    if (picked.length >= limit) break;
    tryPick(c, false);
  }
  for (const c of sorted) {
    if (picked.length >= limit) break;
    tryPick(c, true);
  }

  return picked;
}

function curateTopHeat(pool: CuratedCandidate[], limit: number): CuratedCandidate[] {
  const editorial = pool
    .filter((c) => isFullEditorialCandidate(c))
    .sort(comparePlacement);
  const ranked = [...pool].sort(comparePlacement);

  const picked: CuratedCandidate[] = [];
  const pickedIds = new Set<string>();
  let boostOnly = 0;
  let dexOnly = 0;
  let metricOnly = 0;
  let statusOnly = 0;
  let headlineOnly = 0;

  const counts = () => ({ boostOnly, dexOnly, metricOnly, statusOnly, headlineOnly });

  const canPick = (c: CuratedCandidate): boolean => {
    if (pickedIds.has(c.topicId)) return false;
    const n = counts();
    if (isMarketOnlyBoost(c) && n.boostOnly >= TOP_HEAT_MAX_BOOST_ONLY) return false;
    if (isDexOnlyCandidate(c) && n.dexOnly >= TOP_HEAT_MAX_DEX_ONLY) return false;
    if (isMetricOnlyCandidate(c) && n.metricOnly >= TOP_HEAT_MAX_METRIC_ONLY) return false;
    if (isStatusTopic(c) && (!isSevereFreshStatus(c) || n.statusOnly >= TOP_HEAT_MAX_STATUS)) {
      return false;
    }
    if (isHeadlineOnlyCandidate(c) && n.headlineOnly >= TOP_HEAT_MAX_HEADLINE_ONLY) {
      return false;
    }
    return true;
  };

  const pick = (c: CuratedCandidate): boolean => {
    if (!canPick(c)) return false;
    picked.push(c);
    pickedIds.add(c.topicId);
    if (isMarketOnlyBoost(c)) boostOnly += 1;
    if (isDexOnlyCandidate(c)) dexOnly += 1;
    if (isMetricOnlyCandidate(c)) metricOnly += 1;
    if (isStatusTopic(c)) statusOnly += 1;
    if (isHeadlineOnlyCandidate(c)) headlineOnly += 1;
    return true;
  };

  const unpick = (c: CuratedCandidate) => {
    const idx = picked.findIndex((p) => p.topicId === c.topicId);
    if (idx < 0) return;
    picked.splice(idx, 1);
    pickedIds.delete(c.topicId);
    if (isMarketOnlyBoost(c)) boostOnly -= 1;
    if (isDexOnlyCandidate(c)) dexOnly -= 1;
    if (isMetricOnlyCandidate(c)) metricOnly -= 1;
  };

  for (const c of editorial) {
    if (picked.filter((p) => isFullEditorialCandidate(p)).length >= TOP_HEAT_MIN_EDITORIAL) break;
    if (picked.length >= limit) break;
    pick(c);
  }

  for (const c of ranked) {
    if (picked.length >= limit) break;
    pick(c);
  }

  if (editorial.length > 0) {
    let editorialCount = picked.filter((p) => isFullEditorialCandidate(p)).length;
    while (editorialCount < TOP_HEAT_MIN_EDITORIAL && editorialCount < editorial.length) {
      const nextEd = editorial.find((c) => !pickedIds.has(c.topicId));
      if (!nextEd) break;
      const swapIdx = picked.findIndex(
        (p) =>
          !isFullEditorialCandidate(p) &&
          isMetricOnlyCandidate(p) &&
          !isMarketOnlyBoost(p) &&
          !isHeadlineOnlyCandidate(p)
      );
      if (swapIdx < 0) break;
      unpick(picked[swapIdx]);
      if (!pick(nextEd)) break;
      editorialCount = picked.filter((p) => isFullEditorialCandidate(p)).length;
    }
  }

  return picked.sort(comparePlacement).slice(0, limit);
}

function curateCreatorAngles(pool: CuratedCandidate[], limit: number): CuratedCandidate[] {
  const sorted = [...pool].sort(comparePlacement);
  const picked: CuratedCandidate[] = [];
  const pickedIds = new Set<string>();
  const adapterCounts = new Map<string, number>();
  const bucketCounts = new Map<string, number>();
  let headlineOnly = 0;

  const tryPick = (c: CuratedCandidate, relaxBucket: boolean): boolean => {
    if (pickedIds.has(c.topicId)) return false;
    if (isHeadlineOnlyCandidate(c)) {
      const cap = headlineOnlyCreatorCap(c);
      if (headlineOnly >= cap) return false;
    }
    const aCount = adapterCounts.get(c.primarySourceSlug) ?? 0;
    if (aCount >= 2) return false;
    if (!relaxBucket) {
      const bCount = bucketCounts.get(c.diversityBucket) ?? 0;
      if (bCount >= 1) return false;
    }
    picked.push(c);
    pickedIds.add(c.topicId);
    adapterCounts.set(c.primarySourceSlug, aCount + 1);
    bucketCounts.set(c.diversityBucket, (bucketCounts.get(c.diversityBucket) ?? 0) + 1);
    if (isHeadlineOnlyCandidate(c)) headlineOnly += 1;
    return true;
  };

  const fullEd = sorted.filter((c) => isFullEditorialCandidate(c));
  for (const c of fullEd) {
    if (picked.length >= limit) break;
    tryPick(c, false);
  }
  for (const c of sorted) {
    if (picked.length >= limit) break;
    tryPick(c, false);
  }
  for (const c of sorted) {
    if (picked.length >= limit) break;
    tryPick(c, true);
  }

  return picked.slice(0, limit);
}

/**
 * Build capped, diversity-aware section assignments for today's snapshot.
 */
export function curateRankingSections(candidates: CuratedCandidate[]): SectionCuration {
  const sorted = [...candidates].sort(compareCandidates);

  const topHeat = curateTopHeat(sorted, SECTION_LIMITS.top_heat);

  const newTokens = curateSection(
    sorted.filter((c) => isNewTokenTopic(c)),
    SECTION_LIMITS.new_tokens,
    { maxPerAdapter: SECTION_LIMITS.new_tokens, maxPerBucket: 2 }
  );

  const defiSignals = curateSection(
    sorted.filter((c) => isDefiTopic(c) && !c.isMicroFeeSpike),
    SECTION_LIMITS.defi_signals,
    { maxPerAdapter: 4, maxPerBucket: 2 }
  );

  const creatorPool = sorted.filter((c) => qualifiesForCreator(c));
  const creatorAngles = curateCreatorAngles(
    creatorPool,
    SECTION_LIMITS.creator_angles
  );
  const creatorIds = new Set(creatorAngles.map((c) => c.topicId));

  const investorPool = sorted.filter(
    (c) =>
      qualifiesForInvestor(c) && !isBlockedFromInvestorByCreatorOverlap(c, creatorIds)
  );
  const investorWatchlist = curateInvestorWatchlist(investorPool, SECTION_LIMITS.investor_watchlist);

  const builderWatch = curateBuilderWatch(sorted, SECTION_LIMITS.builder_watch);

  const result: SectionCuration = new Map();
  result.set("top_heat", topHeat);
  result.set("new_tokens", newTokens);
  result.set("defi_signals", defiSignals);
  result.set("creator_angles", creatorAngles);
  result.set("investor_watchlist", investorWatchlist);
  result.set("builder_watch", builderWatch);

  return result;
}
