/**
 * One-off helper: upsert Public Beta Wave 1 source rows (migration 009).
 * Safe to re-run.
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";

const WAVE1_SOURCES = [
  {
    slug: "drift-medium",
    name: "Drift — Medium",
    source_type: "rss" as const,
    base_url: "https://medium.com/@driftprotocol",
    feed_url: "https://medium.com/feed/@driftprotocol",
    reliability: 0.84,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "DeFi / perps official updates",
      max_items_per_run: 10,
      coverage: "defi_perps",
    },
  },
  {
    slug: "metaplex-medium",
    name: "Metaplex — Medium",
    source_type: "rss" as const,
    base_url: "https://medium.com/@metaplex",
    feed_url: "https://medium.com/feed/@metaplex",
    reliability: 0.84,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "NFT / protocol official updates",
      max_items_per_run: 10,
      coverage: "nft_protocol",
    },
  },
  {
    slug: "magiceden-status",
    name: "Magic Eden — Status",
    source_type: "rss" as const,
    base_url: "https://status.magiceden.io",
    feed_url: "https://status.magiceden.io/history.rss",
    reliability: 0.9,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "NFT marketplace incidents / maintenance",
      max_items_per_run: 10,
      coverage: "nft_status",
    },
  },
  {
    slug: "dlnews-rss",
    name: "DL News — RSS",
    source_type: "rss" as const,
    base_url: "https://www.dlnews.com",
    feed_url: "https://www.dlnews.com/arc/outboundfeeds/rss/",
    reliability: 0.78,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "DeFi / ecosystem news (Solana-filtered at ingest)",
      requires_solana_filter: true,
      max_items_per_run: 10,
      coverage: "ecosystem_editorial",
    },
  },
  {
    slug: "decrypt-rss",
    name: "Decrypt — RSS",
    source_type: "rss" as const,
    base_url: "https://decrypt.co",
    feed_url: "https://decrypt.co/feed",
    reliability: 0.76,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "ecosystem / NFT / gaming news (Solana-filtered at ingest)",
      requires_solana_filter: true,
      max_items_per_run: 10,
      coverage: "ecosystem_editorial",
    },
  },
];

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing Supabase admin credentials");
    process.exit(1);
  }

  for (const row of WAVE1_SOURCES) {
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
