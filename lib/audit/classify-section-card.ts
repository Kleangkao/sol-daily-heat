import { SITEMAP_DISCOVERY_SLUGS } from "@/lib/sources/sitemap-ingest-policy";
import { STATUS_SOURCE_SLUGS } from "@/lib/sources/rss-ingest-policy";

const EDITORIAL_RSS_SLUGS = new Set([
  "solana-blog",
  "helius-blog",
  "raydium-medium",
  "marinade-blog",
  "orca-medium",
  "sanctum-medium",
  "drift-medium",
  "metaplex-medium",
  "the-block-news",
  "dlnews-rss",
  "decrypt-rss",
]);

export type SectionCardBucket =
  | "full_editorial"
  | "sitemap_headline_only"
  | "metric_only"
  | "boost_only"
  | "status"
  | "other";

export type SectionComposition = Record<SectionCardBucket, number> & {
  total: number;
};

export function classifySectionCard(input: {
  title: string;
  sourceSlugs: string[];
  itemTypes: string[];
  rankingSignals?: string[];
}): SectionCardBucket {
  const slugs = input.sourceSlugs ?? [];
  const itemTypes = input.itemTypes ?? [];
  const signals = input.rankingSignals ?? [];
  const title = input.title ?? "";

  const hasSitemap = slugs.some((s) => SITEMAP_DISCOVERY_SLUGS.has(s));
  const hasFullEditorialSlug = slugs.some((s) => EDITORIAL_RSS_SLUGS.has(s));
  const hasNews = itemTypes.some((t) => t === "news" || t === "manual");

  if (title.startsWith("DexScreener boost")) return "boost_only";
  if (
    signals.length > 0 &&
    signals.every((s) => s === "boost") &&
    !hasNews
  ) {
    return "boost_only";
  }

  if (slugs.some((s) => STATUS_SOURCE_SLUGS.has(s))) return "status";

  const metricOnly =
    !hasNews &&
    (itemTypes.every((t) => t === "market" || t === "protocol") ||
      slugs.some((s) => s.includes("defillama") || s.includes("dexscreener")));

  if (metricOnly) return "metric_only";

  if (hasSitemap && !hasFullEditorialSlug) return "sitemap_headline_only";

  if (hasFullEditorialSlug || hasNews) return "full_editorial";

  return "other";
}

export function emptyComposition(): SectionComposition {
  return {
    total: 0,
    full_editorial: 0,
    sitemap_headline_only: 0,
    metric_only: 0,
    boost_only: 0,
    status: 0,
    other: 0,
  };
}

export function addToComposition(
  comp: SectionComposition,
  bucket: SectionCardBucket
): void {
  comp.total += 1;
  comp[bucket] += 1;
}
