/** Warning thresholds for private-beta daily audit (tune as board evolves). */

export const WARN_TOP_HEAT_SITEMAP_MAX = 2;
export const WARN_CREATOR_SITEMAP_MAX = 1;
export const WARN_INVESTOR_METRIC_ONLY_MAX = 5;
export const WARN_TOP_HEAT_BOOST_MAX = 2;
export const WARN_TOP_HEAT_METRIC_ONLY_MAX = 5;
export const WARN_SITEMAP_DUP_URL_GROUPS = 0;
export const WARN_RAW_ITEMS_TOTAL = 8_000;
export const WARN_TOPICS_TOTAL = 3_000;
export const WARN_DAILY_RANKINGS_TOTAL = 15_000;
export const WARN_INGEST_RUNS_TOTAL = 500;
export const WARN_RAW_ITEMS_OLDER_THAN_7D = 2_000;

/** Critical enabled sources expected to produce items in 7d window. */
export const CRITICAL_SOURCE_SLUGS = [
  "solana-blog",
  "defillama-solana",
  "dexscreener-solana",
] as const;
