/**
 * Upsert all Wave 4D RSS sources (migrations 013 + 015). Safe to re-run.
 * Run: npx tsx scripts/apply-wave4d-official.ts
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";

const WAVE4D_SOURCES = [
  {
    slug: "marginfi-releases",
    name: "marginfi — GitHub Releases",
    source_type: "rss" as const,
    base_url: "https://github.com/mrgnlabs/marginfi-v2",
    feed_url: "https://github.com/mrgnlabs/marginfi-v2/releases.atom",
    reliability: 0.84,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "marginfi protocol CLI / SDK releases",
      feed_format: "atom",
      max_items_per_run: 5,
      coverage: "defi_builder",
      builder_source: true,
      wave: "4d1",
    },
  },
  {
    slug: "meteoraag-medium",
    name: "Meteora — Medium",
    source_type: "rss" as const,
    base_url: "https://meteoraag.medium.com",
    feed_url: "https://meteoraag.medium.com/feed",
    reliability: 0.86,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "Meteora official DeFi publication",
      max_items_per_run: 10,
      coverage: "defi_official",
      official_source: true,
      wave: "4d",
    },
  },
  {
    slug: "kamino-blog",
    name: "Kamino Blog",
    source_type: "rss" as const,
    base_url: "https://blog.kamino.com",
    feed_url: "https://blog.kamino.com/feed",
    reliability: 0.87,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "Kamino official blog (Substack)",
      max_items_per_run: 10,
      coverage: "defi_official",
      official_source: true,
      wave: "4d",
    },
  },
  {
    slug: "tensor-blog",
    name: "Tensor — Substack",
    source_type: "rss" as const,
    base_url: "https://blog.tensor.trade",
    feed_url: "https://blog.tensor.trade/feed",
    reliability: 0.82,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "Tensor official NFT blog",
      max_items_per_run: 8,
      coverage: "nft_official",
      official_source: true,
      wave: "4d",
    },
  },
  {
    slug: "kamino-releases",
    name: "Kamino — GitHub Releases",
    source_type: "rss" as const,
    base_url: "https://github.com/Kamino-Finance/klend",
    feed_url: "https://github.com/Kamino-Finance/klend/releases.atom",
    reliability: 0.86,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "Kamino klend protocol releases",
      feed_format: "atom",
      max_items_per_run: 5,
      coverage: "defi_builder",
      builder_source: true,
      wave: "4d",
    },
  },
];

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing Supabase admin credentials");
    process.exit(1);
  }

  for (const row of WAVE4D_SOURCES) {
    const { error } = await db
      .from("sources")
      .upsert(row as Record<string, unknown>, { onConflict: "slug" });
    if (error) throw error;
    console.log(`Upserted ${row.slug} (Wave 4D, enabled)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
