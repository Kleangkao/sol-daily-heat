import type { SourceType, EntityStatus } from "@/lib/types/db";

export type ShadowSourceConfig = {
  slug: string;
  name: string;
  source_type: SourceType;
  base_url: string;
  feed_url: string;
  reliability: number;
  is_enabled: false;
  requires_api_key: boolean;
  status: EntityStatus;
  metadata_json: Record<string, unknown>;
};

/** Shadow-only sources — not in production ingest (`is_enabled: false`). */
export const COINTELEGRAPH_SOLANA_SHADOW: ShadowSourceConfig = {
  slug: "cointelegraph-solana-rss",
  name: "Cointelegraph — Solana tag",
  source_type: "rss",
  base_url: "https://cointelegraph.com/tags/solana",
  feed_url: "https://cointelegraph.com/rss/tag/solana",
  reliability: 0.75,
  is_enabled: false,
  requires_api_key: false,
  status: "inactive",
  metadata_json: {
    purpose: "Solana-tagged Cointelegraph editorial (shadow evaluation only)",
    requires_solana_filter: true,
    max_items_per_run: 10,
    coverage: "ecosystem_editorial",
    shadow_only: true,
    production_rankings: false,
  },
};

export const SHADOW_OVERLAP_SOURCE_SLUGS = [
  "the-block-news",
  "decrypt-rss",
  "dlnews-rss",
  "solanafloor-sitemap",
  "solana-blog",
] as const;
