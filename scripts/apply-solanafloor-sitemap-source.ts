/**
 * One-off helper: upsert solanafloor-sitemap source row.
 * Requires migration 005 (source_type 'sitemap') applied on the database.
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import type { SourceType } from "../lib/types/db";

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing Supabase admin credentials");
    process.exit(1);
  }

  const base = {
    slug: "solanafloor-sitemap",
    name: "SolanaFloor — News (sitemap)",
    base_url: "https://solanafloor.com",
    feed_url: "https://solanafloor.com/news/sitemap.xml",
    reliability: 0.75,
    is_enabled: true,
    requires_api_key: false,
    status: "active" as const,
    metadata_json: {
      purpose: "headline-only discovery via public news sitemap",
      max_items_per_run: 15,
      max_age_hours: 168,
      discovery: "sitemap",
      no_article_fetch: true,
    },
  };

  let row: typeof base & { source_type: SourceType } = {
    ...base,
    source_type: "sitemap",
  };

  const { data: existing } = await db
    .from("sources")
    .select("slug")
    .eq("slug", row.slug)
    .maybeSingle();

  if (existing) {
    const { error } = await db.from("sources").update(row).eq("slug", row.slug);
    if (error) {
      console.error("Update failed:", error.message);
      process.exit(1);
    }
    console.log("Updated solanafloor-sitemap");
    return;
  }

  let { error } = await db.from("sources").insert(row);
  if (error?.message?.includes("source_type_check")) {
    row = { ...base, source_type: "api" as const };
    ({ error } = await db.from("sources").insert(row));
  }
  if (error) {
    console.error(
      "Insert failed:",
      error.message,
      "\nApply supabase/migrations/005_solanafloor_sitemap.sql when possible."
    );
    process.exit(1);
  }
  console.log(`Inserted solanafloor-sitemap (source_type=${row.source_type})`);
}

main();
