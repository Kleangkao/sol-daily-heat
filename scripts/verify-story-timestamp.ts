/**
 * Regression checks for story-timestamp changes (read-only + pure logic).
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { fetchHeatDashboard } from "../lib/db/queries/heat-today";
import { getTopicDetail } from "../lib/db/queries/topic-detail";
import {
  formatStoryTimestampLine,
  pickPrimaryRawItem,
  pickStoryTimestampFromItems,
  primarySourceSlug,
  resolveStoryTimeKind,
  utcMetricDayStartIso,
} from "../lib/heat/story-timestamp";
import type { RawItem, Source } from "../lib/types/db";

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`✗ ${msg}`);
    failed += 1;
  } else {
    console.log(`✓ ${msg}`);
  }
}

function testPureLogic() {
  console.log("\n--- pure logic ---\n");

  const highRel = {
    id: "a",
    source_id: "s1",
    published_at: "2026-06-05T10:00:00.000Z",
    fetched_at: "2026-06-06T12:00:00.000Z",
    sources: { slug: "solana-blog", reliability: 0.95 } as Source,
    metadata_json: { item_type: "news" },
  } as unknown as RawItem & { sources?: Source };

  const lowRelNewer = {
    id: "b",
    source_id: "s2",
    published_at: "2026-06-06T11:00:00.000Z",
    fetched_at: "2026-06-06T11:00:00.000Z",
    sources: { slug: "random-rss", reliability: 0.4 } as Source,
    metadata_json: { item_type: "news" },
  } as unknown as RawItem & { sources?: Source };

  const primary = pickPrimaryRawItem([lowRelNewer, highRel]);
  assert(primary?.id === "a", "primary item prefers higher reliability over newer low-trust");

  const metric = {
    id: "m",
    source_id: "s3",
    published_at: utcMetricDayStartIso(new Date("2026-06-06T15:00:00.000Z")),
    fetched_at: "2026-06-06T15:00:00.000Z",
    sources: { slug: "defillama-fees-solana", reliability: 0.85 } as Source,
    metadata_json: { item_type: "protocol", signal: "fees_move" },
  } as unknown as RawItem & { sources?: Source };

  const story = pickStoryTimestampFromItems([metric], ["protocol"]);
  assert(story.kind === "metric_window", "protocol fee signal resolves to metric_window");
  assert(
    story.iso === utcMetricDayStartIso(new Date("2026-06-06T15:00:00.000Z")),
    "metric story uses UTC day start"
  );

  assert(
    resolveStoryTimeKind(["news"], []) === "published",
    "editorial cluster resolves to published"
  );
  assert(
    resolveStoryTimeKind(["market"], ["boost"]) === "reported",
    "dex boost resolves to reported"
  );

  const slug = primarySourceSlug([lowRelNewer, highRel, highRel]);
  assert(slug === "solana-blog", "primarySourceSlug prefers highest reliability slug");

  const line = formatStoryTimestampLine("published", "2026-06-06T10:00:00.000Z");
  assert(line.startsWith("Published"), "formatStoryTimestampLine prefixes Published");
}

async function testLiveQueries() {
  console.log("\n--- live DB (read-only) ---\n");

  const db = getSupabaseAdmin();
  if (!db) {
    console.error("✗ Missing Supabase env — skipping live checks");
    failed += 1;
    return;
  }

  let dashboard;
  try {
    dashboard = await fetchHeatDashboard(db);
  } catch (err) {
    console.error(`✗ fetchHeatDashboard threw: ${err instanceof Error ? err.message : err}`);
    failed += 1;
    return;
  }

  if (!dashboard) {
    console.error("✗ fetchHeatDashboard returned null (no rankings today)");
    failed += 1;
    return;
  }

  assert(dashboard.dataSource === "live", "dashboard loads live data");
  assert(dashboard.topHeat.length > 0, `topHeat has ${dashboard.topHeat.length} cards`);

  const allCards = [
    ...dashboard.topHeat,
    ...dashboard.newTokens,
    ...dashboard.defiSignals,
    ...dashboard.builderWatch,
    ...dashboard.creatorAngles,
    ...dashboard.investorWatchlist,
  ];

  assert(allCards.length > 0, `total section cards: ${allCards.length}`);

  for (const card of allCards) {
    assert(Boolean(card.storyAt), `${card.id.slice(0, 8)}… has storyAt`);
    assert(
      ["published", "reported", "metric_window"].includes(card.storyTimeKind),
      `${card.title.slice(0, 40)}… has valid storyTimeKind`
    );
    assert(
      !Number.isNaN(new Date(card.storyAt).getTime()),
      `${card.title.slice(0, 40)}… storyAt parses as date`
    );
  }

  const sample = dashboard.topHeat[0];
  if (sample) {
    const detail = await getTopicDetail(db, sample.id, dashboard.date);
    assert(detail != null, "getTopicDetail returns topic for top card");
    if (detail) {
      assert(Boolean(detail.storyAt), "topic detail has storyAt");
      assert(Boolean(detail.storyTimeKind), "topic detail has storyTimeKind");
      assert(Boolean(detail.lastUpdatedAt), "topic detail still has scanner refresh time");
    }
  }

  const metricCards = allCards.filter((c) => c.storyTimeKind === "metric_window");
  const editorialCards = allCards.filter((c) => c.storyTimeKind === "published");
  console.log(
    `\n  story kinds: published=${editorialCards.length} metric_window=${metricCards.length} reported=${allCards.length - editorialCards.length - metricCards.length}`
  );
}

async function main() {
  console.log("Story timestamp regression checks");
  testPureLogic();
  await testLiveQueries();

  console.log(failed === 0 ? "\nAll checks passed.\n" : `\n${failed} check(s) failed.\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
