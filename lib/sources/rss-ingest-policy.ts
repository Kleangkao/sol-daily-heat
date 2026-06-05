import type { TopicCategory } from "@/lib/types/db";



/** Per-run ingest caps (verified Project Source Discovery Pass 1 + Wave 1). */

export const RSS_INGEST_ITEM_CAPS: Record<string, number> = {

  "helius-blog": 15,

  "marinade-blog": 15,

  "orca-medium": 10,

  "pyth-status": 10,

  "sanctum-medium": 5,

  "the-block-news": 15,

  "drift-medium": 10,

  "metaplex-medium": 10,

  "magiceden-status": 10,

  "dlnews-rss": 10,

  "decrypt-rss": 10,
  "coindesk-rss": 5,
  "agave-releases": 5,
  "firedancer-releases": 5,
  "jito-solana-releases": 5,
};

/** GitHub release Atom feeds (builder / infra; no GitHub API). */
export const GITHUB_RELEASE_SOURCE_SLUGS = new Set([
  "agave-releases",
  "firedancer-releases",
  "jito-solana-releases",
]);

export function isGithubReleaseSourceSlug(slug: string): boolean {
  return GITHUB_RELEASE_SOURCE_SLUGS.has(slug);
}



/** Skip RSS items older than this at ingest (30 days). */

export const RSS_INGEST_FRESHNESS_HOURS = 30 * 24;



/** Official project blogs: editorial placement up to 30d (ingest-aligned). */

export const PROJECT_OFFICIAL_BLOG_SLUGS = new Set([

  "solana-blog",

  "helius-blog",

  "raydium-medium",

  "marinade-blog",

  "orca-medium",

  "sanctum-medium",

  "drift-medium",

  "metaplex-medium",

]);



/** Do not rank RSS editorial items older than this unless manual. */

export const RSS_RANKING_ARCHIVE_HOURS = 90 * 24;



/** Status/incident feeds — ingest + rank window. */

export const STATUS_SOURCE_SLUGS = new Set([

  "solana-status",

  "pyth-status",

  "magiceden-status",

]);



/** Status feeds prefer ranking when incident is within 7 days. */

export const STATUS_PREFERRED_RANK_HOURS = 7 * 24;



/** Official/project blogs with 30d ingest guard + 90d rank guard. */

export const PROJECT_RSS_STALE_GUARD_SLUGS = new Set([

  "helius-blog",

  "raydium-medium",

  "marinade-blog",

  "orca-medium",

  "sanctum-medium",

  "solana-status",

  "pyth-status",

  "drift-medium",

  "metaplex-medium",

  "magiceden-status",

  "agave-releases",

  "firedancer-releases",

  "jito-solana-releases",

]);

/** Filtered broad RSS: 30d published_at skip at ingest only (not official-source ranking bonus). */
export const FILTERED_BROAD_RSS_STALE_GUARD_SLUGS = new Set([
  "dlnews-rss",
  "decrypt-rss",
  "coindesk-rss",
]);

export function rssIngestUsesStaleGuard(slug: string): boolean {
  return (
    PROJECT_RSS_STALE_GUARD_SLUGS.has(slug) || FILTERED_BROAD_RSS_STALE_GUARD_SLUGS.has(slug)
  );
}

export function rssIngestCap(slug: string, metadata?: Record<string, unknown>): number {

  if (slug in RSS_INGEST_ITEM_CAPS) return RSS_INGEST_ITEM_CAPS[slug];

  if (typeof metadata?.max_items_per_run === "number" && metadata.max_items_per_run > 0) {

    return metadata.max_items_per_run;

  }

  return 40;

}



export function rssIngestMaxAgeHours(slug: string): number {

  return STATUS_SOURCE_SLUGS.has(slug) ? RSS_INGEST_FRESHNESS_HOURS : RSS_INGEST_FRESHNESS_HOURS;

}



export function topicCategoryForSourceSlug(slug: string): TopicCategory | null {

  switch (slug) {

    case "marinade-blog":

    case "orca-medium":

    case "sanctum-medium":

    case "raydium-medium":

    case "drift-medium":

      return "defi";

    case "metaplex-medium":

      return "nft";

    case "pyth-status":

    case "solana-status":

    case "magiceden-status":

    case "helius-blog":
    case "agave-releases":
    case "firedancer-releases":
    case "jito-solana-releases":
      return "infra";

    default:

      return null;

  }

}

