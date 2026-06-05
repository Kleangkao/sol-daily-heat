import { loadShadowSources } from "@/lib/sources/load-shadow-sources";

/** @deprecated Use loadShadowSources() — kept for shadow-cointelegraph-solana.ts */
export const COINTELEGRAPH_SOLANA_SHADOW =
  loadShadowSources().find((s) => s.slug === "cointelegraph-solana-rss")!;

export const SHADOW_OVERLAP_SOURCE_SLUGS = [
  "the-block-news",
  "decrypt-rss",
  "dlnews-rss",
  "solanafloor-sitemap",
  "solana-blog",
] as const;
