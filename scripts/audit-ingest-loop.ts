/**
 * Check ingest/pipeline loop freshness — not stuck?
 * Run: npx tsx scripts/audit-ingest-loop.ts
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing Supabase credentials");
    process.exit(1);
  }

  const now = Date.now();
  const fmt = (iso: string | null) =>
    iso ? `${iso} (${Math.round((now - new Date(iso).getTime()) / 60000)}m ago)` : "never";

  const { data: runs, error: runErr } = await db
    .from("ingest_runs")
    .select("id, started_at, finished_at, status, adapter_results_json, error_summary")
    .order("started_at", { ascending: false })
    .limit(8);

  if (runErr) throw runErr;

  console.log("=== Ingest loop audit ===\n");
  console.log(`Now: ${new Date().toISOString()}`);
  console.log(`Schedule (GitHub Actions): pipeline every 3h, pulse every 30m\n`);

  if (!runs?.length) {
    console.log("WARN: No ingest_runs found — loop may never have run in this DB.");
    process.exit(1);
  }

  const latest = runs[0];
  console.log(`Latest ingest run: ${fmt(latest.started_at as string)}`);
  console.log(`  status: ${latest.status}`);
  console.log(`  finished: ${fmt(latest.finished_at as string)}`);
  if (latest.error_summary) console.log(`  error: ${latest.error_summary}`);

  const ageMin = (now - new Date(latest.started_at as string).getTime()) / 60000;
  if (ageMin > 240) {
    console.log(`\nWARN: Last ingest >4h ago — may be stuck or cron not firing.`);
  } else if (ageMin > 200) {
    console.log(`\nOK: Within ~3h window (next cron expected soon).`);
  } else {
    console.log(`\nOK: Recent ingest within expected 3h cadence.`);
  }

  const results = (latest.adapter_results_json ?? []) as {
    slug: string;
    ok: boolean;
    count: number;
    error?: string;
  }[];

  const wave4d = ["meteoraag-medium", "kamino-blog", "tensor-blog", "kamino-releases", "marginfi-releases"];
  console.log("\nWave 4D in latest run:");
  for (const slug of wave4d) {
    const r = results.find((x) => x.slug === slug);
    if (!r) console.log(`  ${slug}: not in run`);
    else console.log(`  ${slug}: ok=${r.ok} count=${r.count}${r.error ? ` err=${r.error.slice(0, 60)}` : ""}`);
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.log(`\nFailed adapters (${failed.length}):`);
    for (const f of failed.slice(0, 8)) {
      console.log(`  ${f.slug}: ${f.error?.slice(0, 80) ?? "unknown"}`);
    }
  }

  const totalItems = results.reduce((s, r) => s + (r.ok ? r.count : 0), 0);
  console.log(`\nLatest run total items stored: ${totalItems}`);

  console.log("\nRecent runs:");
  for (const r of runs) {
    const arr = (r.adapter_results_json ?? []) as { ok: boolean; count: number }[];
    const items = arr.reduce((s, x) => s + (x.ok ? x.count : 0), 0);
    const fails = arr.filter((x) => !x.ok).length;
    console.log(
      `  ${r.started_at} | ${r.status} | items=${items} | fails=${fails}${r.error_summary ? " | ERR" : ""}`
    );
  }

  const { data: rankings } = await db
    .from("daily_rankings")
    .select("ranking_date")
    .order("ranking_date", { ascending: false })
    .limit(1);

  const rankDate = rankings?.[0]?.ranking_date;
  console.log(`\nLatest ranking_date: ${rankDate ?? "none"}`);

  const { count: todayCount } = await db
    .from("daily_rankings")
    .select("id", { count: "exact", head: true })
    .eq("ranking_date", new Date().toISOString().slice(0, 10));

  console.log(`Rankings today (UTC): ${todayCount ?? 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
