/**
 * Dry-run builder_watch curation (no DB writes).
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { clusterRawItems } from "../lib/process/cluster-topics";
import { computeClusterMetrics } from "../lib/process/cluster-metrics";
import { inferCategory } from "../lib/process/rule-summary";
import { computeHeatScore } from "../lib/scoring/heat-score-v1";
import { isStaleRepeat } from "../lib/scoring/decay";
import { hasFreshRawInWindow, isRawItemInLookback, FRESH_SIGNAL_HOURS } from "../lib/scoring/freshness";
import {
  hasFreshOfficialSource,
  hasOfficialProjectWithin30d,
  isClusterEligibleForRanking,
  isEligibleEditorialTopic,
  isMicroFeeSpikeTopic,
  isStaleOfficialItem,
} from "../lib/scoring/topic-eligibility";
import { computePlacementSortScore } from "../lib/scoring/placement-score";
import { isSevereStatusTitle } from "../lib/scoring/status-signals";
import {
  PROJECT_OFFICIAL_BLOG_SLUGS,
  STATUS_PREFERRED_RANK_HOURS,
  STATUS_SOURCE_SLUGS,
  topicCategoryForSourceSlug,
} from "../lib/sources/rss-ingest-policy";
import { isWithinHours } from "../lib/scoring/freshness";
import {
  hasFullEditorialCorroboration,
  isHeadlineOnlyCluster,
  stripHeadlineOnlyScoreBonuses,
} from "../lib/sources/headline-only";
import { dedupeSitemapRawItemsByCanonical } from "../lib/ingest/dedupe-sitemap-raw-items";
import {
  buildDiversityBucket,
  curateRankingSections,
  type CuratedCandidate,
} from "../lib/process/curate-rankings";
import { qualifiesForBuilder } from "../lib/process/builder-watch";
import { classifySectionCard } from "../lib/audit/classify-section-card";
import type { RawItem, Source } from "../lib/types/db";

function itemTypeOf(item: RawItem): string {
  return (item.metadata_json?.item_type as string) ?? "news";
}

function freshEditorialRssSlugs(items: Array<RawItem & { sources?: Source }>): string[] {
  const slugs = new Set<string>();
  for (const item of items) {
    const src = item.sources;
    if (!src || src.source_type !== "rss") continue;
    const t = itemTypeOf(item);
    if (t !== "news" && t !== "manual") continue;
    if (isStaleOfficialItem(item)) continue;
    const ts = item.published_at ?? item.fetched_at;
    if (!hasFreshRawInWindow([ts], FRESH_SIGNAL_HOURS)) continue;
    slugs.add(src.slug);
  }
  return Array.from(slugs);
}

function clusterSourceSlugs(items: Array<RawItem & { sources?: Source }>): string[] {
  const slugs = new Set<string>();
  for (const item of items) {
    if (item.sources?.slug) slugs.add(item.sources.slug);
  }
  return Array.from(slugs);
}

function primarySourceSlug(items: Array<RawItem & { sources?: Source }>): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    const slug = item.sources?.slug ?? item.source_id;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  let best = "unknown";
  let max = 0;
  for (const [slug, n] of Array.from(counts.entries())) {
    if (n > max) {
      max = n;
      best = slug;
    }
  }
  return best;
}

async function main() {
  const db = getSupabaseAdmin();
  if (!db) process.exit(1);

  const { data: rawRows } = await db
    .from("raw_items")
    .select("*, sources(*)")
    .in("status", ["pending", "processed"])
    .order("fetched_at", { ascending: false })
    .limit(500);

  const items = dedupeSitemapRawItemsByCanonical(
    ((rawRows ?? []) as Array<RawItem & { sources?: Source }>).filter((i) =>
      isRawItemInLookback(i.fetched_at)
    )
  );

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const { data: yesterdayRankings } = await db
    .from("daily_rankings")
    .select("topics(clustering_key)")
    .eq("ranking_date", yesterday)
    .eq("section", "top_heat")
    .eq("status", "published");

  const yesterdayKeys = new Set<string>();
  for (const row of yesterdayRankings ?? []) {
    const key = (row as { topics?: { clustering_key?: string } }).topics?.clustering_key;
    if (key) yesterdayKeys.add(key);
  }

  const groups = clusterRawItems(items);
  const rankingCandidates: CuratedCandidate[] = [];

  for (const group of groups) {
    if (!isClusterEligibleForRanking(group.items)) continue;

    const itemTypes = group.items.map(
      (i) => (i.metadata_json?.item_type as string) ?? "news"
    );
    const clusterMetrics = computeClusterMetrics(group.items);
    const reliabilities = group.items
      .map((i) => (i as RawItem & { sources?: Source }).sources?.reliability ?? 0.5)
      .filter((r) => typeof r === "number");
    const reliabilityAvg =
      reliabilities.length > 0
        ? reliabilities.reduce((a, b) => a + b, 0) / reliabilities.length
        : 0.5;

    const newest = group.items.reduce((max, i) => {
      const t = i.published_at ?? i.fetched_at;
      return !max || new Date(t) > new Date(max) ? t : max;
    }, null as string | null);

    const hasFreshRaw = hasFreshRawInWindow(
      group.items.flatMap((i) => [i.published_at, i.fetched_at])
    );
    if (isStaleRepeat(group.clustering_key, yesterdayKeys, hasFreshRaw)) continue;

    const primarySlug = primarySourceSlug(group.items);
    const textBlob = group.title;
    const category =
      topicCategoryForSourceSlug(primarySlug) ?? inferCategory(textBlob, itemTypes);
    const sourceSlugs = clusterSourceSlugs(group.items);
    const editorialRssSlugs = freshEditorialRssSlugs(group.items);
    const hasEditorialSignal = itemTypes.some((t) => t === "news" || t === "manual");
    const boostOnly =
      clusterMetrics.uniqueSignals.length > 0 &&
      clusterMetrics.uniqueSignals.every((s) => s === "boost") &&
      !hasEditorialSignal &&
      !itemTypes.includes("protocol");

    let feeThresholdPassed = false;
    let feeSmallBaseDiscount = 0;
    for (const item of group.items) {
      const meta = item.metadata_json ?? {};
      if (meta.fee_threshold_passed === true) feeThresholdPassed = true;
      if (typeof meta.fee_small_base_discount === "number") {
        feeSmallBaseDiscount = Math.min(feeSmallBaseDiscount, meta.fee_small_base_discount);
      }
    }

    const headlineOnlyOnly = isHeadlineOnlyCluster(group.items);
    const editorialCorroboration = hasFullEditorialCorroboration(group.items);

    let { heat_score, score_breakdown_json, confidence_score } = computeHeatScore({
      sourceCount: clusterMetrics.effectiveSourceCount,
      newestPublishedAt: newest,
      reliabilityAvg,
      textBlob,
      hasMarketSignal: itemTypes.includes("market"),
      hasProtocolSignal: itemTypes.includes("protocol"),
      isNovelToday: !yesterdayKeys.has(group.clustering_key),
      sourceSlugs,
      freshEditorialRssSlugs: editorialRssSlugs,
      hasEditorialSignal,
      uniqueSignals: clusterMetrics.uniqueSignals,
      boostOnly,
      hasFreshOfficial: hasFreshOfficialSource(group.items),
      hasOfficialWithin30d: hasOfficialProjectWithin30d(group.items),
      feeThresholdPassed,
      feeSmallBaseDiscount: feeSmallBaseDiscount < 0 ? feeSmallBaseDiscount : undefined,
    });

    if (headlineOnlyOnly) {
      stripHeadlineOnlyScoreBonuses(score_breakdown_json);
      heat_score = Object.values(score_breakdown_json).reduce<number>(
        (sum, v) => sum + (typeof v === "number" ? v : 0),
        0
      );
      heat_score = Math.min(100, Math.max(0, heat_score));
    }

    const isEligibleEditorial = isEligibleEditorialTopic(group.items, itemTypes, heat_score);
    const isDexOnly =
      itemTypes.every((t) => t === "market") &&
      sourceSlugs.length > 0 &&
      sourceSlugs.every((s) => s.includes("dexscreener"));
    const isMetricOnly = !itemTypes.some((t) => t === "news" || t === "manual");
    const isMicroFeeSpike = isMicroFeeSpikeTopic(
      clusterMetrics.uniqueSignals,
      score_breakdown_json
    );
    const isStatusTopicFlag = STATUS_SOURCE_SLUGS.has(primarySlug);
    const isPreferredStatus =
      isStatusTopicFlag &&
      newest != null &&
      isWithinHours(newest, STATUS_PREFERRED_RANK_HOURS);

    const placementSortScore = computePlacementSortScore(heat_score, score_breakdown_json, {
      boostOnly,
      isEligibleEditorial,
      hasFreshOfficial: headlineOnlyOnly ? false : hasFreshOfficialSource(group.items),
      isMicroFeeSpike,
      isHeadlineOnly: headlineOnlyOnly,
      isStatusTopic: isStatusTopicFlag,
      isPreferredStatus,
      isSevereStatus: isStatusTopicFlag && isSevereStatusTitle(group.title),
    });

    rankingCandidates.push({
      topicId: group.clustering_key,
      title: group.title,
      heat_score,
      category,
      itemTypes,
      score_breakdown_json,
      confidence_score,
      is_carryover: false,
      uniqueSignals: clusterMetrics.uniqueSignals,
      lastUpdatedAt: new Date().toISOString(),
      newestPublishedAt: newest,
      primarySourceSlug: primarySlug,
      diversityBucket: buildDiversityBucket(
        primarySlug,
        itemTypes,
        clusterMetrics.uniqueSignals,
        group.clustering_key
      ),
      placementSortScore,
      isBoostOnly: boostOnly,
      isDexOnly,
      isMetricOnly,
      isEligibleEditorial,
      isMicroFeeSpike,
      isHeadlineOnly: headlineOnlyOnly,
      hasEditorialCorroboration: editorialCorroboration,
    });
  }

  const curation = curateRankingSections(rankingCandidates);
  const builder = curation.get("builder_watch") ?? [];
  const pool = rankingCandidates.filter(qualifiesForBuilder);

  console.log(
    JSON.stringify(
      {
        builderPool: pool.length,
        builderPicked: builder.length,
        cards: builder.map((c) => ({
          title: c.title.slice(0, 72),
          heat: c.heat_score,
          slug: c.primarySourceSlug,
          category: c.category,
          bucket: classifySectionCard({
            title: c.title,
            sourceSlugs: [c.primarySourceSlug],
            itemTypes: c.itemTypes,
            rankingSignals: c.uniqueSignals,
          }),
        })),
        sections: {
          top_heat: (curation.get("top_heat") ?? []).length,
          creator_angles: (curation.get("creator_angles") ?? []).length,
          investor_watchlist: (curation.get("investor_watchlist") ?? []).length,
        },
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
