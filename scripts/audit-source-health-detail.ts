/**
 * Detailed enabled-source health report (read-only).
 * Run: npx tsx scripts/audit-source-health-detail.ts
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { STATUS_SOURCE_SLUGS } from "../lib/sources/rss-ingest-policy";
import { SITEMAP_DISCOVERY_SLUGS } from "../lib/sources/sitemap-ingest-policy";
import type { Source } from "../lib/types/db";

type AdapterRunRow = {
  slug: string;
  ok: boolean;
  count: number;
  error?: string;
};

type ReasonClass =
  | "feed_stale"
  | "filter_rejected"
  | "fetch_error"
  | "status_feed_quiet"
  | "no_recent_posts"
  | "unknown";

type RecommendedAction =
  | "keep_enabled"
  | "monitor"
  | "lower_priority"
  | "disable_later"
  | "source_research_needed";

type SourceHealthRow = {
  slug: string;
  name: string;
  type: string;
  items7d: number;
  lastFetchedAt: string | null;
  likelyReason: ReasonClass;
  recommendedAction: RecommendedAction;
  detail: string;
};

function cutoffIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function requiresSolanaFilter(source: Source): boolean {
  const meta = source.metadata_json as Record<string, unknown> | null;
  return meta?.requires_solana_filter === true;
}

function classifyZeroSource(
  source: Source,
  items7d: number,
  recentRuns: AdapterRunRow[]
): { reason: ReasonClass; action: RecommendedAction; detail: string } {
  const slug = source.slug;
  const runs = recentRuns.filter((r) => r.slug === slug);
  const lastRun = runs[0];
  const fetchFailed = runs.some((r) => !r.ok);
  const fetchedButZero = runs.some((r) => r.ok && r.count === 0);

  if (fetchFailed && lastRun?.error) {
    return {
      reason: "fetch_error",
      action: "monitor",
      detail: `Recent ingest error: ${lastRun.error.slice(0, 120)}`,
    };
  }

  if (STATUS_SOURCE_SLUGS.has(slug)) {
    return {
      reason: "status_feed_quiet",
      action: "keep_enabled",
      detail: "Status feed enabled; no incidents in the last 7 days is normal when systems are healthy.",
    };
  }

  if (SITEMAP_DISCOVERY_SLUGS.has(slug)) {
    return {
      reason: items7d === 0 ? "no_recent_posts" : "unknown",
      action: "monitor",
      detail: "Sitemap discovery only ingests URLs with lastmod in the last 7 days.",
    };
  }

  if (requiresSolanaFilter(source)) {
    return {
      reason: "filter_rejected",
      action: "lower_priority",
      detail: "Solana keyword filter may reject most items; check ingest logs for passed_filter=0.",
    };
  }

  if (source.source_type === "rss" && fetchedButZero) {
    return {
      reason: "no_recent_posts",
      action: "monitor",
      detail: "RSS fetch succeeded but no new items stored in recent runs (archive may be stale or capped).",
    };
  }

  if (source.last_fetched_at) {
    const ageDays =
      (Date.now() - new Date(source.last_fetched_at).getTime()) / 86400000;
    if (ageDays > 5) {
      return {
        reason: "feed_stale",
        action: "monitor",
        detail: `Last fetched ${Math.round(ageDays)}d ago — feed may be quiet or ingest not running.`,
      };
    }
  }

  if (slug.includes("medium")) {
    return {
      reason: "no_recent_posts",
      action: "lower_priority",
      detail: "Medium archive feeds often yield low volume; enabled but low priority until volume improves.",
    };
  }

  return {
    reason: "unknown",
    action: "source_research_needed",
    detail: "Enabled source with zero items in 7d — verify feed URL and ingest caps manually.",
  };
}

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing Supabase admin client");
    process.exit(1);
  }

  const { data: sources, error: srcErr } = await db
    .from("sources")
    .select("*")
    .eq("is_enabled", true)
    .order("slug");
  if (srcErr) throw srcErr;

  const cutoff7d = cutoffIso(7);
  const { data: rawRows, error: rawErr } = await db
    .from("raw_items")
    .select("source_id")
    .gte("fetched_at", cutoff7d);
  if (rawErr) throw rawErr;

  const countBySource = new Map<string, number>();
  for (const row of rawRows ?? []) {
    const id = row.source_id as string;
    countBySource.set(id, (countBySource.get(id) ?? 0) + 1);
  }

  const { data: runs, error: runErr } = await db
    .from("ingest_runs")
    .select("adapter_results_json, started_at")
    .order("started_at", { ascending: false })
    .limit(10);
  if (runErr) throw runErr;

  const recentAdapterRuns: AdapterRunRow[] = [];
  for (const run of runs ?? []) {
    const arr = run.adapter_results_json as AdapterRunRow[];
    if (Array.isArray(arr)) recentAdapterRuns.push(...arr);
  }

  const rows: SourceHealthRow[] = [];
  for (const source of (sources ?? []) as Source[]) {
    const items7d = countBySource.get(source.id) ?? 0;
    if (items7d > 0) continue;
    const classified = classifyZeroSource(source, items7d, recentAdapterRuns);
    rows.push({
      slug: source.slug,
      name: source.name,
      type: source.source_type,
      items7d,
      lastFetchedAt: source.last_fetched_at,
      likelyReason: classified.reason,
      recommendedAction: classified.action,
      detail: classified.detail,
    });
  }

  console.log(`\nSource health detail — ${new Date().toISOString().slice(0, 10)}`);
  console.log(`Enabled sources: ${sources?.length ?? 0}`);
  console.log(`Zero items in last 7d: ${rows.length}\n`);

  if (rows.length === 0) {
    console.log("All enabled sources have at least one raw_item in the last 7 days.\n");
    return;
  }

  console.table(
    rows.map((r) => ({
      slug: r.slug,
      type: r.type,
      reason: r.likelyReason,
      action: r.recommendedAction,
      lastFetched: r.lastFetchedAt?.slice(0, 10) ?? "—",
    }))
  );

  for (const r of rows) {
    console.log(`\n• ${r.slug} (${r.name})`);
    console.log(`  reason: ${r.likelyReason}`);
    console.log(`  action: ${r.recommendedAction}`);
    console.log(`  detail: ${r.detail}`);
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
