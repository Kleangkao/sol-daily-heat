/**
 * One-off helper: upsert Wave 2 GitHub release source rows (migration 010).
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";

const SOURCES = [
  {
    slug: "agave-releases",
    name: "Agave — GitHub Releases",
    source_type: "rss" as const,
    base_url: "https://github.com/anza-xyz/agave",
    feed_url: "https://github.com/anza-xyz/agave/releases.atom",
    reliability: 0.88,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "validator client releases (Anza/Agave)",
      feed_format: "atom",
      max_items_per_run: 5,
      coverage: "infra_builder",
      builder_source: true,
    },
  },
  {
    slug: "firedancer-releases",
    name: "Firedancer — GitHub Releases",
    source_type: "rss" as const,
    base_url: "https://github.com/firedancer-io/firedancer",
    feed_url: "https://github.com/firedancer-io/firedancer/releases.atom",
    reliability: 0.86,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "Firedancer / Frankendancer client releases",
      feed_format: "atom",
      max_items_per_run: 5,
      coverage: "infra_builder",
      builder_source: true,
    },
  },
  {
    slug: "jito-solana-releases",
    name: "Jito Solana — GitHub Releases",
    source_type: "rss" as const,
    base_url: "https://github.com/jito-foundation/jito-solana",
    feed_url: "https://github.com/jito-foundation/jito-solana/releases.atom",
    reliability: 0.86,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "Jito validator / MEV client releases",
      feed_format: "atom",
      max_items_per_run: 5,
      coverage: "infra_builder",
      builder_source: true,
    },
  },
];

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing Supabase admin credentials");
    process.exit(1);
  }
  for (const row of SOURCES) {
    const { error } = await db.from("sources").upsert(row as Record<string, unknown>, {
      onConflict: "slug",
    });
    if (error) {
      console.error(`${row.slug}: ${error.message}`);
      process.exit(1);
    }
    console.log(`Upserted ${row.slug}`);
  }
}

main();
