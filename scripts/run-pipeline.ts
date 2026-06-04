import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { runPipeline } from "../lib/process/run-pipeline";

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  console.log("Running process pipeline…");
  const result = await runPipeline(db);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("daily_rankings_section_check") || msg.includes("builder_watch")) {
    console.error(
      "Database missing builder_watch section. Apply supabase/migrations/007_builder_watch_section.sql in the Supabase SQL editor, then re-run."
    );
  }
  console.error(e);
  process.exit(1);
});
