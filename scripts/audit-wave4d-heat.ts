/**
 * Wave 4D: confirm ingested items have heat scores + section placement.
 * Run: npx tsx scripts/audit-wave4d-heat.ts
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";

const WAVE4D_SLUGS = [
  "meteoraag-medium",
  "kamino-blog",
  "tensor-blog",
  "kamino-releases",
  "marginfi-releases",
];

async function main() {
  const db = getSupabaseAdmin();
  if (!db) process.exit(1);

  const { data: sources } = await db
    .from("sources")
    .select("id,slug,is_enabled")
    .in("slug", WAVE4D_SLUGS);
  const bySlug = new Map((sources ?? []).map((s) => [s.slug as string, s.id as string]));

  console.log("Wave 4D heat score audit\n");

  for (const slug of WAVE4D_SLUGS) {
    const sourceId = bySlug.get(slug);
    if (!sourceId) {
      console.log(`${slug}: MISSING in DB`);
      continue;
    }

    const { data: rawItems } = await db
      .from("raw_items")
      .select("id,title")
      .eq("source_id", sourceId)
      .gte("fetched_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(5);

    const rawIds = (rawItems ?? []).map((r) => r.id as string);
    if (!rawIds.length) {
      console.log(`${slug}: no items (7d) — enabled, waiting for fresh feed`);
      continue;
    }

    const { data: links } = await db
      .from("topic_sources")
      .select("topic_id")
      .in("raw_item_id", rawIds);

    const topicIds = Array.from(new Set((links ?? []).map((l) => l.topic_id as string)));
    if (!topicIds.length) {
      console.log(`${slug}: ${rawIds.length} item(s) but no topic link yet`);
      continue;
    }

    const { data: rankings } = await db
      .from("daily_rankings")
      .select(
        "section,rank_position,heat_score,score_breakdown_json,ranking_date,topics!inner(title)"
      )
      .in("topic_id", topicIds)
      .order("ranking_date", { ascending: false })
      .limit(5);

    for (const r of rankings ?? []) {
      const topicRow = Array.isArray(r.topics) ? r.topics[0] : r.topics;
      const title = (topicRow as { title?: string } | null)?.title ?? "(unknown)";
      const breakdown = r.score_breakdown_json as Record<string, number> | null;
      const officialBonus = breakdown?.official_source_bonus ?? 0;
      console.log(
        `${slug}: [${r.section} #${r.rank_position}] heat=${r.heat_score} official_bonus=${officialBonus} — ${title}`
      );
    }
    if (!rankings?.length) {
      console.log(`${slug}: topic linked but no ranking row (may be ineligible / stale)`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
