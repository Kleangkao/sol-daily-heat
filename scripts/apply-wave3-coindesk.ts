/**
 * Upsert CoinDesk Wave 3 source row (migration 011). Safe to re-run.
 * Run: npx tsx scripts/apply-wave3-coindesk.ts
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";

const COINDESK_SOURCE = {
  slug: "coindesk-rss",
  name: "CoinDesk — RSS",
  source_type: "rss" as const,
  base_url: "https://www.coindesk.com",
  feed_url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
  reliability: 0.78,
  is_enabled: true,
  requires_api_key: false,
  status: "active" as const,
  metadata_json: {
    purpose: "Broad crypto editorial (Solana-filtered at ingest) — Wave 3 trial",
    requires_solana_filter: true,
    max_items_per_run: 8,
    coverage: "ecosystem_editorial",
    broad_rss_trial: true,
    official_source: false,
  },
};

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing Supabase admin credentials");
    process.exit(1);
  }

  const { error } = await db.from("sources").upsert(COINDESK_SOURCE, { onConflict: "slug" });
  if (error) throw error;
  console.log("Upserted coindesk-rss (Wave 3 trial, enabled)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
