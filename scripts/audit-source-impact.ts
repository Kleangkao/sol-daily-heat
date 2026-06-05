/**
 * Source impact audit — raw_items, rankings, section distribution for a trial slug.
 * Run: npx tsx scripts/audit-source-impact.ts [slug]
 * Default slug: coindesk-rss
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import {
  classifyBroadRssNoise,
  LOW_SIGNAL_NOISE_CLASSES,
} from "../lib/sources/broad-rss-noise";

const SLUG = process.argv[2] ?? "coindesk-rss";
const DAYS = 7;

function cutoffIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing Supabase admin credentials");
    process.exit(1);
  }

  const { data: source, error: srcErr } = await db
    .from("sources")
    .select("id,slug,name,is_enabled,metadata_json")
    .eq("slug", SLUG)
    .maybeSingle();

  if (srcErr) throw srcErr;
  if (!source) {
    console.error(`Source not found: ${SLUG}`);
    process.exit(1);
  }

  const sourceId = source.id as string;
  const since7d = cutoffIso(DAYS);

  const { data: rawItems, error: rawErr } = await db
    .from("raw_items")
    .select("id,title,canonical_url,published_at,fetched_at,metadata_json")
    .eq("source_id", sourceId)
    .gte("fetched_at", since7d)
    .order("fetched_at", { ascending: false });

  if (rawErr) throw rawErr;

  const items = rawItems ?? [];
  const titles = items.map((r) => (r.title as string) ?? "");

  const noiseCounts: Record<string, number> = {};
  let lowSignal = 0;
  for (const row of items) {
    const title = (row.title as string) ?? "";
    const url = (row.canonical_url as string) ?? "";
    const cls = classifyBroadRssNoise(title, url);
    noiseCounts[cls] = (noiseCounts[cls] ?? 0) + 1;
    if (LOW_SIGNAL_NOISE_CLASSES.has(cls)) lowSignal += 1;
  }

  const { data: topicLinks } = await db
    .from("topic_sources")
    .select("topic_id,raw_item_id")
    .in(
      "raw_item_id",
      items.map((r) => r.id as string)
    );

  const topicIds = Array.from(
    new Set((topicLinks ?? []).map((l) => l.topic_id as string))
  );

  let rankings: { section: string; rank_position: number; topic_id: string }[] = [];
  if (topicIds.length > 0) {
    const { data: rankRows } = await db
      .from("daily_rankings")
      .select("section,rank_position,topic_id,ranking_date")
      .in("topic_id", topicIds)
      .order("ranking_date", { ascending: false })
      .limit(50);
    rankings = (rankRows ?? []) as typeof rankings;
  }

  const sectionDist: Record<string, number> = {};
  for (const r of rankings) {
    sectionDist[r.section] = (sectionDist[r.section] ?? 0) + 1;
  }

  const { data: topics } =
    topicIds.length > 0
      ? await db.from("topics").select("id,title").in("id", topicIds)
      : { data: [] };

  const topicTitle = new Map((topics ?? []).map((t) => [t.id as string, t.title as string]));

  console.log(`Source impact audit — ${SLUG}`);
  console.log(`Run at: ${new Date().toISOString()}`);
  console.log(`Enabled: ${source.is_enabled}`);
  console.log(`raw_items (7d): ${items.length}`);
  console.log(`topics linked: ${topicIds.length}`);
  console.log(`ranking rows (recent): ${rankings.length}`);
  console.log(`noise (low-signal): ${items.length ? Math.round((lowSignal / items.length) * 100) : 0}%`);
  console.log(`noise breakdown: ${JSON.stringify(noiseCounts)}`);
  console.log(`section distribution: ${JSON.stringify(sectionDist)}`);

  if (titles.length) {
    console.log("\nTitles ingested (7d):");
    for (const t of titles.slice(0, 15)) console.log(`  + ${t}`);
  } else {
    console.log("\nTitles ingested (7d): (none)");
  }

  if (rankings.length) {
    console.log("\nRankings containing this source:");
    for (const r of rankings.slice(0, 15)) {
      const title = topicTitle.get(r.topic_id) ?? r.topic_id;
      console.log(`  [${r.section} #${r.rank_position}] ${title}`);
    }
  }

  const { data: runs } = await db
    .from("ingest_runs")
    .select("adapter_results_json,finished_at")
    .order("finished_at", { ascending: false })
    .limit(3);

  const adapterResults = (runs ?? []).flatMap((run) => {
    const json = run.adapter_results_json as { slug?: string; count?: number; ok?: boolean }[] | null;
    return (json ?? []).filter((r) => r.slug === SLUG);
  });

  if (adapterResults.length) {
    console.log("\nRecent ingest adapter results:");
    for (const r of adapterResults.slice(0, 3)) {
      console.log(`  ${JSON.stringify(r)}`);
    }
    console.log(
      "\nFilter rejections: see ingest stdout [rss:coindesk-rss] fetched=… passed_filter=… rejected=…"
    );
  }

  const warnings: string[] = [];
  if (items.length === 0) warnings.push("no raw_items in 7d");
  if (items.length > 0 && lowSignal / items.length > 0.3) {
    warnings.push("high low-signal noise ratio");
  }
  const topHeat = sectionDist.top_heat ?? 0;
  if (topHeat > 3) warnings.push("coindesk dominates top_heat (>3 rows)");

  console.log("\n--- JSON ---");
  console.log(
    JSON.stringify(
      {
        slug: SLUG,
        rawItems7d: items.length,
        topicsLinked: topicIds.length,
        rankingsCount: rankings.length,
        sectionDistribution: sectionDist,
        noisePct: items.length ? Number((lowSignal / items.length).toFixed(2)) : 0,
        noiseCounts,
        warnings,
        titles: titles.slice(0, 10),
      },
      null,
      2
    )
  );

  if (warnings.length) {
    console.log(`\nWARNINGS: ${warnings.join("; ")}`);
    process.exit(1);
  }
  console.log("\nPASS — no impact warnings.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
