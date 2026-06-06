/** Feed config for shadow-cointelegraph-solana.ts (production enabled via Wave 4A). */
export const COINTELEGRAPH_SOLANA_SHADOW = {
  slug: "cointelegraph-solana-rss",
  feed_url: "https://cointelegraph.com/rss/tag/solana",
  metadata_json: { max_items_per_run: 10 },
} as const;

export const SHADOW_OVERLAP_SOURCE_SLUGS = [
  "the-block-news",
  "decrypt-rss",
  "dlnews-rss",
  "coindesk-rss",
  "cointelegraph-solana-rss",
  "solanafloor-sitemap",
  "solana-blog",
] as const;
