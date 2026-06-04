import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { runCleanup } from "../lib/db/run-cleanup";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log(dryRun ? "Cleanup dry-run (no deletes)…" : "Running retention cleanup…");
  const result = await runCleanup(db, { dryRun });
  console.log(JSON.stringify(result, null, 2));

  if (dryRun) {
    console.log("\nRe-run without --dry-run to apply deletes.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
