import type { RawItem, Source } from "@/lib/types/db";
import { OFFICIAL_SOURCE_SLUGS } from "@/lib/scoring/official-sources";
import { isWithinHours } from "@/lib/scoring/freshness";
import {
  PROJECT_OFFICIAL_BLOG_SLUGS,
  PROJECT_RSS_STALE_GUARD_SLUGS,
  RSS_INGEST_FRESHNESS_HOURS,
  RSS_RANKING_ARCHIVE_HOURS,
  STATUS_PREFERRED_RANK_HOURS,
  STATUS_SOURCE_SLUGS,
} from "@/lib/sources/rss-ingest-policy";
import {
  SITEMAP_DEFAULT_MAX_AGE_HOURS,
  SITEMAP_DISCOVERY_SLUGS,
} from "@/lib/sources/sitemap-ingest-policy";

export const TOP_HEAT_EDITORIAL_HOURS = 48;
export const TOP_HEAT_EDITORIAL_EXTENDED_HOURS = 168;
export const OFFICIAL_MAX_AGE_HOURS = 30 * 24;
export const STATUS_MAX_AGE_HOURS = 30 * 24;
export const STATUS_PREFERRED_HOURS = 7 * 24;
/** Official-source heat bonus only when a project/official RSS item is within this window. */
export const OFFICIAL_BONUS_MAX_AGE_HOURS = 7 * 24;

export function itemTimestamp(item: RawItem & { sources?: Source }): string | null {
  return item.published_at ?? item.fetched_at ?? null;
}

export function isStaleOfficialItem(item: RawItem & { sources?: Source }): boolean {
  const slug = item.sources?.slug ?? "";
  if (!PROJECT_RSS_STALE_GUARD_SLUGS.has(slug)) return false;
  const ts = itemTimestamp(item);
  if (!ts) return true;
  if (STATUS_SOURCE_SLUGS.has(slug)) {
    return !isWithinHours(ts, STATUS_MAX_AGE_HOURS);
  }
  return !isWithinHours(ts, OFFICIAL_MAX_AGE_HOURS);
}

/** Drop RSS items older than 90d from ranking (archive), except manual. */
export function isRssBeyondRankingWindow(item: RawItem & { sources?: Source }): boolean {
  const type = item.sources?.source_type ?? "";
  if (type !== "rss") return false;
  const ts = itemTimestamp(item);
  if (!ts) return true;
  return !isWithinHours(ts, RSS_RANKING_ARCHIVE_HOURS);
}

/** Drop ancient official/project RSS from influencing rankings. */
export function isClusterEligibleForRanking(
  items: Array<RawItem & { sources?: Source }>
): boolean {
  const rankable = items.filter((item) => {
    const slug = item.sources?.slug ?? "";
    const type = item.sources?.source_type ?? "";
    const itemType = (item.metadata_json?.item_type as string) ?? "news";

    if (itemType === "market" || itemType === "protocol") {
      if (item.metadata_json?.fee_ingest_rejected === true) return false;
      return true;
    }

    const sitemapDiscovery =
      item.metadata_json?.sitemap_discovery === true &&
      SITEMAP_DISCOVERY_SLUGS.has(slug);
    if (type === "sitemap" || sitemapDiscovery) {
      if (!sitemapDiscovery) return false;
      const ts = itemTimestamp(item);
      return ts != null && isWithinHours(ts, SITEMAP_DEFAULT_MAX_AGE_HOURS);
    }

    if (type !== "rss") return itemType === "manual";

    if (isStaleOfficialItem(item)) return false;
    if (isRssBeyondRankingWindow(item)) return false;

    if (STATUS_SOURCE_SLUGS.has(slug)) {
      const ts = itemTimestamp(item);
      return ts != null && isWithinHours(ts, STATUS_MAX_AGE_HOURS);
    }

    return true;
  });

  return rankable.length > 0;
}

/** Official project blog item within 30d (ingest window), outside 7d fresh bonus. */
export function hasOfficialProjectWithin30d(
  items: Array<RawItem & { sources?: Source }>
): boolean {
  for (const item of items) {
    const slug = item.sources?.slug ?? "";
    if (!PROJECT_OFFICIAL_BLOG_SLUGS.has(slug)) continue;
    if (isStaleOfficialItem(item)) continue;
    const ts = itemTimestamp(item);
    if (ts != null && isWithinHours(ts, RSS_INGEST_FRESHNESS_HOURS)) return true;
  }
  return false;
}

export function hasFreshOfficialSource(
  items: Array<RawItem & { sources?: Source }>
): boolean {
  for (const item of items) {
    const slug = item.sources?.slug ?? "";
    if (!OFFICIAL_SOURCE_SLUGS.has(slug)) continue;
    if (isStaleOfficialItem(item)) continue;
    const ts = itemTimestamp(item);
    if (!ts) continue;
    const bonusWindow = STATUS_SOURCE_SLUGS.has(slug)
      ? STATUS_PREFERRED_RANK_HOURS
      : OFFICIAL_BONUS_MAX_AGE_HOURS;
    if (!isWithinHours(ts, bonusWindow)) continue;
    return true;
  }
  return false;
}

export function isEligibleEditorialTopic(
  items: Array<RawItem & { sources?: Source }>,
  itemTypes: string[],
  heatScore: number
): boolean {
  const hasEditorial = itemTypes.some((t) => t === "news" || t === "manual");
  if (!hasEditorial) return false;

  const editorialItems = items.filter((i) => {
    const t = (i.metadata_json?.item_type as string) ?? "news";
    return t === "news" || t === "manual";
  });

  const headlineOnly =
    editorialItems.length > 0 &&
    editorialItems.every((i) => i.metadata_json?.sitemap_discovery === true);
  if (headlineOnly) {
    return editorialItems.some((i) => {
      const ts = itemTimestamp(i);
      return (
        ts != null &&
        isWithinHours(ts, TOP_HEAT_EDITORIAL_HOURS) &&
        heatScore >= 48
      );
    });
  }

  const fresh48 = editorialItems.some((i) => {
    const ts = itemTimestamp(i);
    return ts != null && isWithinHours(ts, TOP_HEAT_EDITORIAL_HOURS);
  });
  if (fresh48) return true;

  const fresh30Official = editorialItems.some((i) => {
    const slug = i.sources?.slug ?? "";
    if (!PROJECT_OFFICIAL_BLOG_SLUGS.has(slug)) return false;
    const ts = itemTimestamp(i);
    return ts != null && isWithinHours(ts, RSS_INGEST_FRESHNESS_HOURS);
  });
  if (fresh30Official && heatScore >= 48) return true;

  const fresh7d = editorialItems.some((i) => {
    const ts = itemTimestamp(i);
    return ts != null && isWithinHours(ts, TOP_HEAT_EDITORIAL_EXTENDED_HOURS);
  });
  if (!fresh7d) return false;

  const strongOfficial = hasFreshOfficialSource(editorialItems) && heatScore >= 48;
  return strongOfficial;
}

export function isMicroFeeSpikeTopic(
  uniqueSignals: string[],
  scoreBreakdown: Record<string, number | undefined>
): boolean {
  if (uniqueSignals.includes("chain_fees") && scoreBreakdown.fee_threshold_passed === 1) {
    return false;
  }
  if (!uniqueSignals.includes("fees_move")) return false;
  return (
    (scoreBreakdown.fee_small_base_discount ?? 0) < 0 ||
    scoreBreakdown.fee_threshold_passed !== 1
  );
}
