import {
  GITHUB_RELEASE_SOURCE_SLUGS,
  STATUS_SOURCE_SLUGS,
} from "@/lib/sources/rss-ingest-policy";
import { isWithinHours } from "@/lib/scoring/freshness";
import { STATUS_MAX_AGE_HOURS } from "@/lib/scoring/topic-eligibility";
import type { CuratedCandidate } from "./curate-rankings";
import { compareCandidates } from "./curate-rankings";

export const BUILDER_SOURCE_SLUGS = new Set([
  "helius-blog",
  "solana-blog",
  "solana-status",
  "pyth-status",
  "magiceden-status",
  "solanafloor-sitemap",
  "the-block-news",
  "agave-releases",
  "firedancer-releases",
  "jito-solana-releases",
]);

/** Max GitHub release cards in builder_watch when enough non-release builder topics exist. */
export const BUILDER_MAX_GITHUB_RELEASE_TOTAL = 3;

const BUILDER_MAX_GITHUB_RELEASE_TOTAL_WHEN_SPARSE = 4;
const BUILDER_MIN_FRESH_STATUS = 1;
const BUILDER_PREFERRED_FRESH_STATUS = 2;
const BUILDER_MIN_EDITORIAL_INFRA = 1;

const BUILDER_CATEGORY_MATCH = new Set([
  "infra",
  "ecosystem",
  "ai",
] as const);

const BUILDER_KEYWORD_RE =
  /\b(rpc|api|sdk|developer|devnet|testnet|validator|client|firedancer|anza|agave|helius|pyth|oracle|status|incident|outage|security|exploit|tokenization|rwa|payments|subscription|subscriptions|infra|tooling|compression|zk|account abstraction|depin|mobile)\b/i;

const BUILDER_HEADLINE_ONLY_MAX = 2;
const BUILDER_MAX_PER_ADAPTER = 2;

export function hasBuilderKeyword(text: string): boolean {
  return BUILDER_KEYWORD_RE.test(text);
}

function isStatusTopic(c: CuratedCandidate): boolean {
  return STATUS_SOURCE_SLUGS.has(c.primarySourceSlug);
}

function isGithubReleaseTopic(c: CuratedCandidate): boolean {
  return GITHUB_RELEASE_SOURCE_SLUGS.has(c.primarySourceSlug);
}

function isFreshStatusTopic(c: CuratedCandidate): boolean {
  return (
    isStatusTopic(c) &&
    c.newestPublishedAt != null &&
    isWithinHours(c.newestPublishedAt, STATUS_MAX_AGE_HOURS)
  );
}

function isPumpStyleTopic(c: CuratedCandidate): boolean {
  const t = c.title.toLowerCase();
  if (/dexscreener boost/i.test(t)) return true;
  if (/…pump\b|\bpump\b/.test(t) && !hasBuilderKeyword(c.title)) return true;
  return false;
}

function isNewPairOrMemeOnly(c: CuratedCandidate): boolean {
  if (c.category === "meme") return true;
  if (c.isBoostOnly) return true;
  if (
    c.isDexOnly &&
    c.itemTypes.every((t) => t === "market") &&
    !hasBuilderKeyword(c.title)
  ) {
    return true;
  }
  if (
    c.itemTypes.includes("market") &&
    !c.itemTypes.some((t) => t === "news" || t === "manual" || t === "protocol") &&
    c.uniqueSignals.every((s) => s === "new_pair" || s === "boost")
  ) {
    return !hasBuilderKeyword(c.title);
  }
  return false;
}

function isPureFeeSpike(c: CuratedCandidate): boolean {
  if (c.isMicroFeeSpike) return true;
  if (
    c.isMetricOnly &&
    (c.uniqueSignals.includes("fees_move") || c.uniqueSignals.includes("chain_fees")) &&
    !hasBuilderKeyword(c.title) &&
    !isStatusTopic(c)
  ) {
    return true;
  }
  return false;
}

function isPureTvlMover(c: CuratedCandidate): boolean {
  if (!c.isMetricOnly || isStatusTopic(c)) return false;
  if (hasBuilderKeyword(c.title)) return false;
  if (c.category === "infra" || BUILDER_SOURCE_SLUGS.has(c.primarySourceSlug)) return false;
  if (c.itemTypes.includes("protocol") && c.category === "defi") {
    return !hasBuilderKeyword(c.title);
  }
  const onlyTvlVol = c.uniqueSignals.every(
    (s) => s === "tvl_change" || s === "volume_move" || s === "stake_flow"
  );
  return onlyTvlVol && !hasBuilderKeyword(c.title);
}

function isCreatorNarrativeOnly(c: CuratedCandidate): boolean {
  if (["gaming", "nft"].includes(c.category) && !hasBuilderKeyword(c.title)) {
    return true;
  }
  return false;
}

function matchesBuilderCategory(c: CuratedCandidate): boolean {
  if (BUILDER_CATEGORY_MATCH.has(c.category as "infra" | "ecosystem" | "ai")) {
    return true;
  }
  return /\b(security|depin|mobile)\b/i.test(c.title);
}

export function qualifiesForBuilder(c: CuratedCandidate): boolean {
  if (isNewPairOrMemeOnly(c)) return false;
  if (isPureFeeSpike(c)) return false;
  if (isPureTvlMover(c)) return false;
  if (isPumpStyleTopic(c)) return false;
  if (isCreatorNarrativeOnly(c)) return false;

  if (isFreshStatusTopic(c)) return true;
  if (BUILDER_SOURCE_SLUGS.has(c.primarySourceSlug)) return true;
  if (matchesBuilderCategory(c)) return true;
  if (hasBuilderKeyword(c.title)) return true;
  if (
    c.itemTypes.includes("protocol") &&
    (c.category === "infra" || hasBuilderKeyword(c.title))
  ) {
    return true;
  }

  return false;
}

function isFullEditorialBuilder(c: CuratedCandidate): boolean {
  return (
    c.isEligibleEditorial &&
    !c.isHeadlineOnly &&
    qualifiesForBuilder(c)
  );
}

function isBuilderEditorialInfra(c: CuratedCandidate): boolean {
  return (
    isFullEditorialBuilder(c) &&
    !isGithubReleaseTopic(c) &&
    !isStatusTopic(c)
  );
}

function isStrongHeadlineOnlyBuilder(c: CuratedCandidate): boolean {
  return c.isHeadlineOnly && hasBuilderKeyword(c.title) && qualifiesForBuilder(c);
}

function compareBuilderPlacement(a: CuratedCandidate, b: CuratedCandidate): number {
  const aStatus = isFreshStatusTopic(a) ? 1 : 0;
  const bStatus = isFreshStatusTopic(b) ? 1 : 0;
  if (bStatus !== aStatus) return bStatus - aStatus;

  const aGh = isGithubReleaseTopic(a) ? 1 : 0;
  const bGh = isGithubReleaseTopic(b) ? 1 : 0;
  if (bGh !== aGh) return bGh - aGh;

  const aEd = isFullEditorialBuilder(a) ? 1 : 0;
  const bEd = isFullEditorialBuilder(b) ? 1 : 0;
  if (bEd !== aEd) return bEd - aEd;

  const aHo = isStrongHeadlineOnlyBuilder(a) ? 1 : 0;
  const bHo = isStrongHeadlineOnlyBuilder(b) ? 1 : 0;
  if (bHo !== aHo) return bHo - aHo;

  const aMetric = a.isMetricOnly ? 0 : 1;
  const bMetric = b.isMetricOnly ? 0 : 1;
  if (bMetric !== aMetric) return bMetric - aMetric;

  return compareCandidates(a, b);
}

function githubMaxTotal(nonGithubEligibleCount: number): number {
  return nonGithubEligibleCount < 2
    ? BUILDER_MAX_GITHUB_RELEASE_TOTAL_WHEN_SPARSE
    : BUILDER_MAX_GITHUB_RELEASE_TOTAL;
}

function githubDiversitySatisfied(
  ghSlugCounts: Map<string, number>,
  githubPool: CuratedCandidate[],
  pickedIds: Set<string>
): boolean {
  for (const slug of Array.from(GITHUB_RELEASE_SOURCE_SLUGS)) {
    const hasAvailable = githubPool.some(
      (c) => c.primarySourceSlug === slug && !pickedIds.has(c.topicId)
    );
    if (!hasAvailable) continue;
    if ((ghSlugCounts.get(slug) ?? 0) < 1) return false;
  }
  return true;
}

function canPickGithub(
  c: CuratedCandidate,
  ghCount: number,
  ghMax: number,
  ghSlugCounts: Map<string, number>,
  githubPool: CuratedCandidate[],
  pickedIds: Set<string>
): boolean {
  if (ghCount >= ghMax) return false;
  const slugCount = ghSlugCounts.get(c.primarySourceSlug) ?? 0;
  if (slugCount >= 1 && !githubDiversitySatisfied(ghSlugCounts, githubPool, pickedIds)) {
    return false;
  }
  return true;
}

export function curateBuilderWatch(
  pool: CuratedCandidate[],
  limit: number
): CuratedCandidate[] {
  const eligible = pool.filter(qualifiesForBuilder);
  const sorted = [...eligible].sort(compareBuilderPlacement);
  const nonGithubEligibleCount = eligible.filter((c) => !isGithubReleaseTopic(c)).length;
  const ghMax = githubMaxTotal(nonGithubEligibleCount);
  const freshStatusPool = sorted.filter(isFreshStatusTopic);
  const editorialPool = sorted.filter(isBuilderEditorialInfra);
  const githubPool = sorted.filter(isGithubReleaseTopic);

  const picked: CuratedCandidate[] = [];
  const pickedIds = new Set<string>();
  const adapterCounts = new Map<string, number>();
  const ghSlugCounts = new Map<string, number>();
  let headlineOnly = 0;
  let ghCount = 0;

  const tryPick = (c: CuratedCandidate): boolean => {
    if (pickedIds.has(c.topicId)) return false;
    if (c.isHeadlineOnly && !hasBuilderKeyword(c.title)) return false;
    if (c.isHeadlineOnly && headlineOnly >= BUILDER_HEADLINE_ONLY_MAX) return false;

    if (isGithubReleaseTopic(c)) {
      if (!canPickGithub(c, ghCount, ghMax, ghSlugCounts, githubPool, pickedIds)) {
        return false;
      }
    } else {
      const aCount = adapterCounts.get(c.primarySourceSlug) ?? 0;
      if (aCount >= BUILDER_MAX_PER_ADAPTER) return false;
    }

    picked.push(c);
    pickedIds.add(c.topicId);
    if (isGithubReleaseTopic(c)) {
      ghCount += 1;
      ghSlugCounts.set(
        c.primarySourceSlug,
        (ghSlugCounts.get(c.primarySourceSlug) ?? 0) + 1
      );
    } else {
      adapterCounts.set(
        c.primarySourceSlug,
        (adapterCounts.get(c.primarySourceSlug) ?? 0) + 1
      );
    }
    if (c.isHeadlineOnly) headlineOnly += 1;
    return true;
  };

  const statusSorted = [...freshStatusPool].sort(compareBuilderPlacement);
  for (let i = 0; i < Math.min(BUILDER_PREFERRED_FRESH_STATUS, statusSorted.length); i++) {
    if (picked.length >= limit) break;
    tryPick(statusSorted[i]);
  }

  if (
    freshStatusPool.length > 0 &&
    !picked.some(isFreshStatusTopic) &&
    statusSorted[0]
  ) {
    tryPick(statusSorted[0]);
  }

  for (const c of editorialPool) {
    if (picked.length >= limit) break;
    if (picked.filter(isBuilderEditorialInfra).length >= BUILDER_MIN_EDITORIAL_INFRA) {
      break;
    }
    tryPick(c);
  }

  for (const slug of Array.from(GITHUB_RELEASE_SOURCE_SLUGS)) {
    if (picked.length >= limit || ghCount >= ghMax) break;
    const best = githubPool.find(
      (c) => c.primarySourceSlug === slug && !pickedIds.has(c.topicId)
    );
    if (best) tryPick(best);
  }

  for (const c of githubPool) {
    if (picked.length >= limit || ghCount >= ghMax) break;
    tryPick(c);
  }

  for (const c of sorted) {
    if (picked.length >= limit) break;
    tryPick(c);
  }

  return picked.slice(0, limit);
}
