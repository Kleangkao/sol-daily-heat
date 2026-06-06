/**
 * Wave 4A: enable Cointelegraph Solana tag RSS + bump CoinDesk ingest cap (5 → 8).
 * Run: npx tsx scripts/apply-wave4a.ts
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";

const COINTELEGRAPH_SOLANA = {
  slug: "cointelegraph-solana-rss",
  name: "Cointelegraph — Solana tag",
  source_type: "rss" as const,
  base_url: "https://cointelegraph.com/tags/solana",
  feed_url: "https://cointelegraph.com/rss/tag/solana",
  reliability: 0.75,
  is_enabled: true,
  requires_api_key: false,
  status: "active" as const,
  metadata_json: {
    purpose:
      "Solana-tagged Cointelegraph editorial (secondary Solana filter at ingest)",
    requires_solana_filter: true,
    max_items_per_run: 10,
    coverage: "ecosystem_editorial",
    wave: "4a",
    official_source: false,
  },
};

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing Supabase admin credentials");
    process.exit(1);
  }

  const { error: ctErr } = await db
    .from("sources")
    .upsert(COINTELEGRAPH_SOLANA, { onConflict: "slug" });
  if (ctErr) throw ctErr;
  console.log("Upserted cointelegraph-solana-rss (Wave 4A, enabled)");

  const { data: cdRow, error: cdFetchErr } = await db
    .from("sources")
    .select("metadata_json")
    .eq("slug", "coindesk-rss")
    .maybeSingle();
  if (cdFetchErr) throw cdFetchErr;
  if (!cdRow) {
    console.warn("coindesk-rss not found — run apply-wave3-coindesk.ts first");
  } else {
    const meta = (cdRow.metadata_json ?? {}) as Record<string, unknown>;
    const { error: cdErr } = await db
      .from("sources")
      .update({
        metadata_json: { ...meta, max_items_per_run: 8 },
      })
      .eq("slug", "coindesk-rss");
    if (cdErr) throw cdErr;
    console.log("Updated coindesk-rss max_items_per_run → 8");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
