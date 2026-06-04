import type { RawItem, Source } from "@/lib/types/db";
import { SITEMAP_DISCOVERY_SLUGS } from "@/lib/sources/sitemap-ingest-policy";

export function isSitemapDiscoveryItem(
  item: RawItem & { sources?: Source }
): boolean {
  return item.metadata_json?.sitemap_discovery === true;
}

export function isSitemapDiscoverySlug(slug: string): boolean {
  return SITEMAP_DISCOVERY_SLUGS.has(slug);
}

/** Cluster has only headline-only sitemap news (no full RSS/manual body). */
export function isHeadlineOnlyCluster(
  items: Array<RawItem & { sources?: Source }>
): boolean {
  const editorial = items.filter((i) => {
    const t = (i.metadata_json?.item_type as string) ?? "news";
    return t === "news" || t === "manual";
  });
  if (editorial.length === 0) return false;
  return editorial.every(isSitemapDiscoveryItem);
}

/** Another non-sitemap editorial source in the same cluster. */
export function hasFullEditorialCorroboration(
  items: Array<RawItem & { sources?: Source }>
): boolean {
  return items.some((i) => {
    const t = (i.metadata_json?.item_type as string) ?? "news";
    if (t !== "news" && t !== "manual") return false;
    if (isSitemapDiscoveryItem(i)) return false;
    const slug = i.sources?.slug ?? "";
    if (slug === "manual-curator") return true;
    return i.sources?.source_type === "rss";
  });
}

/** Investor watchlist: headline-only needs clear ecosystem/risk angle. */
export function headlineOnlyInvestorRelevance(title: string, category: string): boolean {
  if (["regulatory", "infra", "defi", "ecosystem"].includes(category)) return true;
  return /\b(tokeniz|unlock|risk|outage|incident|regulat|etf|liquidat|exploit|hack|sec\b|treasury|staking|perps?)\b/i.test(
    title
  );
}

export function stripHeadlineOnlyScoreBonuses(
  breakdown: Record<string, number | undefined>
): void {
  delete breakdown.official_source_bonus;
  delete breakdown.editorial_confirmation;
}

/** Section caps for headline-only sitemap discovery cards. */
export const TOP_HEAT_MAX_HEADLINE_ONLY = 2;
export const CREATOR_MAX_HEADLINE_ONLY_STANDALONE = 1;
export const CREATOR_MAX_HEADLINE_ONLY_WITH_CORROBORATION = 2;
