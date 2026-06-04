/**
 * Read-only local/private-beta audit. Does not mutate the database.
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { runLocalAudit } from "../lib/audit/run-local-audit";

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const tableMode = process.argv.includes("--table");
  const report = await runLocalAudit(db);

  if (tableMode) {
    console.log(`\nSol Daily Heat — audit ${report.rankingDate}`);
    console.log(`dataSource: ${report.dashboard.dataSource}`);
    console.log("\n--- top_heat composition ---");
    console.table(report.sectionComposition.top_heat);
    console.log("\n--- builder_watch ---");
    console.table(report.sectionComposition.builder_watch);
    console.log("\n--- creator_angles ---");
    console.table(report.sectionComposition.creator_angles);
    console.log("\n--- investor_watchlist ---");
    console.table(report.sectionComposition.investor_watchlist);
    console.log("\n--- raw_items by source (7d) ---");
    console.table(report.rawItemsBySource7d.slice(0, 15));
    console.log("\n--- solanafloor sitemap ---");
    console.table(report.solanafloorSitemap);
    console.log("\n--- supabase growth ---");
    console.table(report.supabaseGrowth);
    if (report.warnings.length > 0) {
      console.log("\n--- warnings ---");
      for (const w of report.warnings) console.log(`  • ${w}`);
    }
    console.log("\n(JSON: re-run without --table)\n");
  }

  console.log(JSON.stringify(report, null, 2));

  if (report.warnings.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
