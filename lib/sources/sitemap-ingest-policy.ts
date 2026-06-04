/** Public sitemap discovery sources (headline-only, no article fetch). */

export const SOLANAFLOOR_SITEMAP_SLUG = "solanafloor-sitemap";

export const SITEMAP_DISCOVERY_SLUGS = new Set([SOLANAFLOOR_SITEMAP_SLUG]);

/** Default max URLs stored per ingest run. */
export const SITEMAP_DEFAULT_MAX_ITEMS = 15;

/** Only ingest entries with lastmod within this window (7 days). */
export const SITEMAP_DEFAULT_MAX_AGE_HOURS = 7 * 24;

export const SOLANAFLOOR_NEWS_SITEMAP_URL =
  "https://solanafloor.com/news/sitemap.xml";

export const SOLANAFLOOR_SITEMAP_INDEX_URL =
  "https://solanafloor.com/sitemap.xml";
