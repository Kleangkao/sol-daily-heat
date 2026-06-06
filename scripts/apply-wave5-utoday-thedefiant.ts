/**
 * Upsert Wave 5 broad RSS sources (migration 014). Safe to re-run.
 * Run: npx tsx scripts/apply-wave5-utoday-thedefiant.ts
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";

const WAVE5_SOURCES = [
  {
    slug: "utoday-rss",
    name: "U.Today — RSS",
    source_type: "rss" as const,
    base_url: "https://u.today",
    feed_url: "https://u.today/rss",
    reliability: 0.67,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "Broad crypto editorial (Solana-filtered at ingest) — Wave 5",
      requires_solana_filter: true,
      max_items_per_run: 8,
      coverage: "ecosystem_editorial",
      broad_rss_trial: true,
      official_source: false,
    },
  },
  {
    slug: "thedefiant-rss",
    name: "The Defiant — RSS",
    source_type: "rss" as const,
    base_url: "https://thedefiant.io",
    feed_url: "https://thedefiant.io/feed",
    reliability: 0.76,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "DeFi editorial (Solana-filtered at ingest) — Wave 5",
      requires_solana_filter: true,
      max_items_per_run: 8,
      coverage: "ecosystem_editorial",
      broad_rss_trial: true,
      official_source: false,
    },
  },
];

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing Supabase admin credentials");
    process.exit(1);
  }

  for (const row of WAVE5_SOURCES) {
    const { error } = await db.from("sources").upsert(row, { onConflict: "slug" });
    if (error) throw error;
    console.log(`Upserted ${row.slug} (Wave 5, enabled)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
