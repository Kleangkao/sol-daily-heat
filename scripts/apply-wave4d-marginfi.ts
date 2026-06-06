/**
 * Wave 4D.1: marginfi GitHub releases (verified via audit-quick-sources).
 * Run: npx tsx scripts/apply-wave4d-marginfi.ts
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";

const MARGINFI_RELEASES = {
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
};

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing Supabase admin credentials");
    process.exit(1);
  }
  const { error } = await db
    .from("sources")
    .upsert(MARGINFI_RELEASES, { onConflict: "slug" });
  if (error) throw error;
  console.log("Upserted marginfi-releases (Wave 4D.1, enabled)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
