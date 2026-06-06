import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawItem, Source, TopicCategory } from "@/lib/types/db";
import { clusterRawItems } from "./cluster-topics";
import { computeClusterMetrics } from "./cluster-metrics";
import {
  buildCreatorAngle,
  buildInvestorWatchline,
  buildRuleSummary,
  buildWhyHot,
  defaultRiskNote,
  inferCategory,
  uniqueSnippets,
} from "./rule-summary";
import { getSummaryProvider } from "./ai-summary";
import { extractEntitiesFromCluster, upsertTopicTokenLink } from "./link-entities";
import { repairTokenMintsFromTopicSources } from "./repair-token-mints";
import { computeHeatScore } from "@/lib/scoring/heat-score-v1";
import { isStaleRepeat, isUpdatedStoryCarryover } from "@/lib/scoring/decay";
import {
  hasFreshRawInWindow,
  isRawItemInLookback,
  FRESH_SIGNAL_HOURS,
} from "@/lib/scoring/freshness";
import {
  hasFreshOfficialSource,
  hasOfficialProjectWithin30d,
  isClusterEligibleForRanking,
  isEligibleEditorialTopic,
  isMicroFeeSpikeTopic,
  isStaleOfficialItem,
} from "@/lib/scoring/topic-eligibility";
import { computePlacementSortScore } from "@/lib/scoring/placement-score";
import { isSevereStatusTitle } from "@/lib/scoring/status-signals";
import {
  STATUS_PREFERRED_RANK_HOURS,
  STATUS_SOURCE_SLUGS,
} from "@/lib/sources/rss-ingest-policy";
import { isWithinHours } from "@/lib/scoring/freshness";
import {
  hasFullEditorialCorroboration,
  isHeadlineOnlyCluster,
  stripHeadlineOnlyScoreBonuses,
} from "@/lib/sources/headline-only";
import { dedupeSitemapRawItemsByCanonical } from "@/lib/ingest/dedupe-sitemap-raw-items";
import { assignRankPositions } from "@/lib/db/assign-rank-positions";
import { pruneSupersededForDate, writeRankingSnapshot } from "@/lib/db/ranking-snapshot";
import {
  buildDiversityBucket,
  curateRankingSections,
  type CuratedCandidate,
} from "./curate-rankings";
import { buildTopicEvidence } from "./build-evidence";
import { toSlug } from "@/lib/text/normalize";
import { topicCategoryForSourceSlug } from "@/lib/sources/rss-ingest-policy";
import {
  pickPrimaryRawItem,
  pickStoryTimestampFromItems,
  primarySourceSlug,
} from "@/lib/heat/story-timestamp";

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function itemTypeOf(item: RawItem): string {
  return (item.metadata_json?.item_type as string) ?? "news";
}

function freshEditorialRssSlugs(
  items: Array<RawItem & { sources?: Source }>
): string[] {
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

export async function runPipeline(db: SupabaseClient): Promise<{
  topicsProcessed: number;
  rankingsWritten: number;
  tokenMintRepair: Awaited<ReturnType<typeof repairTokenMintsFromTopicSources>>;
}> {
  const rankingDate = todayDate();
  const summaryProvider = getSummaryProvider();

  const { data: rawRows, error: rawErr } = await db
    .from("raw_items")
    .select("*, sources(*)")
    .in("status", ["pending", "processed"])
    .order("fetched_at", { ascending: false })
    .limit(500);

  if (rawErr) throw rawErr;
  const items = dedupeSitemapRawItemsByCanonical(
    ((rawRows ?? []) as Array<RawItem & { sources?: Source }>).filter((i) =>
      isRawItemInLookback(i.fetched_at)
    )
  );
  if (items.length === 0) {
    const tokenMintRepair = await repairTokenMintsFromTopicSources(db);
    return { topicsProcessed: 0, rankingsWritten: 0, tokenMintRepair };
  }

  const { data: yesterdayRankings } = await db
    .from("daily_rankings")
    .select("topics(clustering_key)")
    .eq("ranking_date", new Date(Date.now() - 86400000).toISOString().slice(0, 10))
    .eq("section", "top_heat")
    .eq("status", "published");

  const yesterdayKeys = new Set<string>();
  for (const row of yesterdayRankings ?? []) {
    const key = (row as { topics?: { clustering_key?: string } }).topics?.clustering_key;
    if (key) yesterdayKeys.add(key);
  }

  const groups = clusterRawItems(items);
  const rankingCandidates: CuratedCandidate[] = [];
  let topicsProcessed = 0;
  let rankingsWritten = 0;

  for (const group of groups) {
    if (!isClusterEligibleForRanking(group.items)) {
      continue;
    }

    const snippets = uniqueSnippets(group.items.map((i) => i.snippet ?? ""));
    const textBlob = [group.title, ...snippets].join(" ");
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

    if (isStaleRepeat(group.clustering_key, yesterdayKeys, hasFreshRaw)) {
      continue;
    }

    const primaryItem = pickPrimaryRawItem(group.items);
    const primarySlug = primarySourceSlug(group.items);
    const storyTimestamp = pickStoryTimestampFromItems(group.items, itemTypes);
    const category =
      topicCategoryForSourceSlug(primarySlug) ?? inferCategory(textBlob, itemTypes);
    let summary = buildRuleSummary(group.title, snippets, {
      itemTypes,
      items: group.items,
    });
    const aiSummary = await summaryProvider.summarize(group.title, textBlob);
    const interpretation_type = aiSummary ? "ai" : "rule_based";
    if (aiSummary) summary = aiSummary;

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

    const hasFreshOfficial = hasFreshOfficialSource(group.items);
    const hasOfficialWithin30d = hasOfficialProjectWithin30d(group.items);

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
      hasFreshOfficial,
      hasOfficialWithin30d,
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

    const isEligibleEditorial = isEligibleEditorialTopic(
      group.items,
      itemTypes,
      heat_score
    );
    const isDexOnly =
      itemTypes.every((t) => t === "market") &&
      sourceSlugs.length > 0 &&
      sourceSlugs.every((s) => s.includes("dexscreener"));
    const isMetricOnly = !itemTypes.some((t) => t === "news" || t === "manual");
    const isMicroFeeSpike = isMicroFeeSpikeTopic(
      clusterMetrics.uniqueSignals,
      score_breakdown_json
    );
    const isStatusTopic = STATUS_SOURCE_SLUGS.has(primarySlug);
    const isPreferredStatus =
      isStatusTopic &&
      newest != null &&
      isWithinHours(newest, STATUS_PREFERRED_RANK_HOURS);

    const placementSortScore = computePlacementSortScore(heat_score, score_breakdown_json, {
      boostOnly,
      isEligibleEditorial,
      hasFreshOfficial: headlineOnlyOnly ? false : hasFreshOfficial,
      isMicroFeeSpike,
      isHeadlineOnly: headlineOnlyOnly,
      isStatusTopic,
      isPreferredStatus,
      isSevereStatus: isStatusTopic && isSevereStatusTitle(group.title),
    });

    const why_hot = buildWhyHot(clusterMetrics);
    const risk_note = defaultRiskNote();
    const slug = group.slug || toSlug(group.title);

    const evidence = buildTopicEvidence({
      title: group.title,
      summary,
      whyHot: why_hot,
      category,
      interpretationType: interpretation_type,
      items: group.items,
      scoreBreakdown: score_breakdown_json,
      clusterMetrics,
    });

    const topicPayload = {
      slug,
      title: group.title,
      summary,
      category,
      clustering_key: group.clustering_key,
      why_hot,
      risk_note,
      confidence_score,
      interpretation_type,
      status: "active" as const,
      last_updated_at: new Date().toISOString(),
      metadata_json: {
        creator_angle: buildCreatorAngle(group.title, category),
        investor_watchline: buildInvestorWatchline(group.title),
        item_types: itemTypes,
        display_source_count: clusterMetrics.displaySourceCount,
        signal_count: clusterMetrics.signalCount,
        story_at: storyTimestamp.iso,
        story_time_kind: storyTimestamp.kind,
        story_source_slug: storyTimestamp.sourceSlug,
        evidence,
      },
    };

    const { data: existingTopic } = await db
      .from("topics")
      .select("id")
      .eq("clustering_key", group.clustering_key)
      .maybeSingle();

    let topicId: string;
    if (existingTopic?.id) {
      topicId = existingTopic.id;
      await db.from("topics").update(topicPayload).eq("id", topicId);
    } else {
      const { data: inserted, error: insErr } = await db
        .from("topics")
        .insert({ ...topicPayload, first_seen_at: new Date().toISOString() })
        .select("id")
        .single();
      if (insErr || !inserted?.id) continue;
      topicId = inserted.id;
    }
    topicsProcessed += 1;

    for (const raw of group.items) {
      await db.from("topic_sources").upsert(
        {
          topic_id: topicId,
          raw_item_id: raw.id,
          source_id: raw.source_id,
          source_url: raw.canonical_url,
          is_primary: primaryItem != null && raw.id === primaryItem.id,
        },
        { onConflict: "topic_id,raw_item_id" }
      );
      await db.from("raw_items").update({ status: "processed" }).eq("id", raw.id);
    }

    const clusterItems = group.items.map((item) => {
      const withSrc = item as RawItem & { sources?: Source };
      return {
        title: item.title,
        metadata_json: item.metadata_json ?? {},
        sources: withSrc.sources,
      };
    });
    const { tokens, projects } = extractEntitiesFromCluster(clusterItems, textBlob);

    for (const t of tokens) {
      await upsertTopicTokenLink(db, topicId, t);
    }

    for (const p of projects) {
      const pslug = p.slug ?? p.name.toLowerCase().replace(/\s+/g, "-");
      const { data: prot } = await db
        .from("protocols")
        .upsert({ slug: pslug, name: p.name, category: p.type }, { onConflict: "slug" })
        .select("id")
        .maybeSingle();
      if (prot?.id) {
        await db.from("topic_protocols").upsert(
          { topic_id: topicId, protocol_id: prot.id, relation_type: "mentioned" },
          { onConflict: "topic_id,protocol_id" }
        );
      }
    }

    const is_carryover = isUpdatedStoryCarryover(
      group.clustering_key,
      yesterdayKeys,
      hasFreshRaw
    );

    rankingCandidates.push({
      topicId,
      title: group.title,
      heat_score,
      category,
      itemTypes,
      score_breakdown_json,
      confidence_score,
      is_carryover,
      uniqueSignals: clusterMetrics.uniqueSignals,
      lastUpdatedAt: topicPayload.last_updated_at,
      storyAt: storyTimestamp.iso,
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

  const sectionCuration = curateRankingSections(rankingCandidates);

  const snapshot = await writeRankingSnapshot(db, rankingDate, sectionCuration);
  rankingsWritten = snapshot.written;

  await assignRankPositions(db, rankingDate);
  await pruneSupersededForDate(db, rankingDate);

  const tokenMintRepair = await repairTokenMintsFromTopicSources(db);

  return { topicsProcessed, rankingsWritten, tokenMintRepair };
}
