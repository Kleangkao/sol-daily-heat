import type { SupabaseClient } from "@supabase/supabase-js";
import { parseStoredEvidence } from "@/lib/process/build-evidence";
import {
  pickStoryTimestampFromSources,
  readStoredStoryAt,
  readStoredStoryTimeKind,
} from "@/lib/heat/story-timestamp";
import { STATUS_SOURCE_SLUGS } from "@/lib/sources/rss-ingest-policy";
import { SECTION_LABELS } from "@/lib/types/heat";
import type {
  RankingSection,
  ScoreBreakdown,
  Source,
  Topic,
  Token,
  Protocol,
  RawItem,
} from "@/lib/types/db";
import type {
  TopicDetailView,
  TopicSourceSnippet,
  TopicTimelineEntry,
} from "@/lib/types/topic-detail";

import { resolveTopicSourceImageUrl } from "@/lib/heat/source-image-url";

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function solscanTokenUrl(mint: string): string {
  return `https://solscan.io/token/${mint}`;
}

type TopicRankingRow = {
  ranking_date: string;
  section: RankingSection;
  heat_score: number;
  rank_position: number | null;
  score_breakdown_json: ScoreBreakdown;
  confidence_score: number;
};

/** Prefer Top Heat row for the snapshot date; else highest heat_score that day (never confidence). */
function pickHeatRankingRow(rows: TopicRankingRow[], date: string): TopicRankingRow | null {
  const forDate = rows.filter((r) => r.ranking_date === date);
  if (forDate.length === 0) return null;
  const topHeat = forDate.find((r) => r.section === "top_heat");
  if (topHeat) return topHeat;
  return forDate.reduce((best, row) =>
    Number(row.heat_score) > Number(best.heat_score) ? row : best
  );
}

function parseRuleBasedHeatScore(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function buildBuilderNoteFromMeta(
  sectionAppearances: RankingSection[],
  category: string,
  sourceSlugs: string[]
): string | null {
  if (sectionAppearances.includes("builder_watch")) {
    return "Builder context: this topic appears in Builder / Infra Watch. Monitor infrastructure, tooling, or operational impact.";
  }
  const hasStatus = sourceSlugs.some((s) => STATUS_SOURCE_SLUGS.has(s));
  if (category === "infra" || hasStatus) {
    return "Builder context: monitor infra, tooling, or operational impact from this topic.";
  }
  return null;
}

type TopicSourceRow = {
  id: string;
  source_url: string | null;
  is_primary: boolean | null;
  raw_item_id: string | null;
  sources: Source | null;
  raw_items: RawItem | null;
};

export async function getTopicDetail(
  db: SupabaseClient,
  topicId: string,
  rankingDate?: string
): Promise<TopicDetailView | null> {
  const date = rankingDate ?? todayDate();

  const { data: topicRow, error: topicErr } = await db
    .from("topics")
    .select(
      `*,
      topic_tokens ( tokens ( symbol, name, mint_address ) ),
      topic_protocols ( protocols ( slug, name, category, website_url ) ),
      topic_sources (
        id,
        source_url,
        is_primary,
        raw_item_id,
        sources ( slug, name, source_type, reliability ),
        raw_items (
          id,
          title,
          snippet,
          canonical_url,
          published_at,
          fetched_at,
          metadata_json
        )
      )`
    )
    .eq("id", topicId)
    .maybeSingle();

  if (topicErr || !topicRow) return null;

  const topic = topicRow as Topic & {
    topic_tokens?: Array<{ tokens: Token | null }>;
    topic_protocols?: Array<{ protocols: Protocol | null }>;
    topic_sources?: TopicSourceRow[];
  };

  const { data: rankings } = await db
    .from("daily_rankings")
    .select(
      "ranking_date, section, heat_score, rank_position, score_breakdown_json, confidence_score, is_carryover"
    )
    .eq("topic_id", topicId)
    .eq("status", "published")
    .order("ranking_date", { ascending: false })
    .order("heat_score", { ascending: false });

  const rankingRows = (rankings ?? []) as TopicRankingRow[];
  const todayRows = rankingRows.filter((r) => r.ranking_date === date);
  const heatRankingRow = pickHeatRankingRow(rankingRows, date);

  const meta = (topic.metadata_json ?? {}) as Record<string, unknown>;
  const evidence = parseStoredEvidence(meta.evidence) ?? null;

  const scoreBreakdown = (heatRankingRow?.score_breakdown_json ?? {}) as ScoreBreakdown;
  const heatScore = heatRankingRow
    ? parseRuleBasedHeatScore(heatRankingRow.heat_score)
    : null;

  const sectionAppearancesToday = todayRows.map((r) => ({
    section: r.section as RankingSection,
    sectionLabel: SECTION_LABELS[r.section as RankingSection] ?? r.section,
    heatScore: Number(r.heat_score),
    rankPosition: r.rank_position != null ? Number(r.rank_position) : null,
    rankingDate: r.ranking_date as string,
  }));

  const sectionKeys = sectionAppearancesToday.map((s) => s.section);
  const sourceSlugs = Array.from(
    new Set(
      (topic.topic_sources ?? [])
        .map((ts) => ts.sources?.slug)
        .filter((s): s is string => Boolean(s))
    )
  );

  const timelineMap = new Map<string, TopicTimelineEntry>();
  const sourceSnippets: TopicSourceSnippet[] = [];
  for (const ts of topic.topic_sources ?? []) {
    const raw = ts.raw_items;
    const src = ts.sources;
    const key = raw?.id ?? ts.id;
    const metaRaw = (raw?.metadata_json ?? {}) as Record<string, unknown>;
    const itemType = (metaRaw.item_type as string) ?? "news";
    const headlineOnly = metaRaw.sitemap_discovery === true;

    const entry: TopicTimelineEntry = {
      id: key,
      sourceName: src?.name ?? "Source",
      sourceSlug: src?.slug ?? "unknown",
      title: raw?.title ?? topic.title,
      url:
        (raw?.canonical_url && /^https?:\/\//i.test(raw.canonical_url)
          ? raw.canonical_url
          : null) ??
        (ts.source_url && /^https?:\/\//i.test(ts.source_url) ? ts.source_url : null),
      publishedAt: raw?.published_at ?? null,
      fetchedAt: raw?.fetched_at ?? topic.last_updated_at,
      itemType,
      signal: typeof metaRaw.signal === "string" ? metaRaw.signal : null,
      headlineOnly,
      isPrimary: Boolean(ts.is_primary),
    };
    timelineMap.set(key, entry);

    const snippet = raw?.snippet?.trim();
    if (snippet && snippet.length > 20) {
      sourceSnippets.push({
        sourceName: src?.name ?? "Source",
        text: snippet,
        isPrimary: Boolean(ts.is_primary),
      });
    }
  }

  const timeline = Array.from(timelineMap.values()).sort((a, b) => {
    const ta = new Date(a.publishedAt ?? a.fetchedAt).getTime();
    const tb = new Date(b.publishedAt ?? b.fetchedAt).getTime();
    return tb - ta;
  });

  const headlineOnlySources = timeline.some((t) => t.headlineOnly);

  const sourceImageUrl = resolveTopicSourceImageUrl(
    (topic.topic_sources ?? []).map((ts) => ({
      id: ts.id,
      is_primary: ts.is_primary,
      raw_items: ts.raw_items
        ? {
            id: ts.raw_items.id,
            metadata_json: (ts.raw_items.metadata_json ?? {}) as Record<string, unknown>,
          }
        : null,
    })),
    timeline
  );

  const tokens =
    topic.topic_tokens?.map((tt) => {
      const t = tt.tokens;
      const mint = t?.mint_address ?? null;
      return {
        symbol: t?.symbol ?? "?",
        name: t?.name ?? null,
        mintAddress: mint,
        explorerUrl: mint ? solscanTokenUrl(mint) : null,
      };
    }) ?? [];

  const protocols =
    topic.topic_protocols?.map((tp) => {
      const p = tp.protocols;
      return {
        name: p?.name ?? "Unknown",
        slug: p?.slug ?? "unknown",
        category: p?.category ?? null,
        websiteUrl: p?.website_url ?? null,
      };
    }) ?? [];

  const itemTypes = Array.isArray(meta.item_types)
    ? (meta.item_types as string[])
    : [];
  const timelineSignals = timeline
    .map((entry) => entry.signal)
    .filter((s): s is string => Boolean(s));
  const storedStoryAt = readStoredStoryAt(meta);
  const storedStoryKind = readStoredStoryTimeKind(meta);
  const storyPick = pickStoryTimestampFromSources(
    timeline.map((entry) => ({
      publishedAt: entry.publishedAt,
      fetchedAt: entry.fetchedAt,
      reliability:
        topic.topic_sources?.find((ts) => ts.sources?.slug === entry.sourceSlug)?.sources
          ?.reliability ?? null,
      itemType: entry.itemType,
      signal: entry.signal,
    })),
    itemTypes,
    timelineSignals,
    topic.first_seen_at
  );

  return {
    id: topic.id,
    title: topic.title,
    summary: topic.summary ?? "",
    category: topic.category,
    whyHot: topic.why_hot ?? "Clustered signals from today's scanner window.",
    riskNote: topic.risk_note ?? "Context only. Not investment advice.",
    interpretationType: topic.interpretation_type,
    confidence: Number(
      heatRankingRow?.confidence_score ?? topic.confidence_score ?? 0
    ),
    firstSeenAt: topic.first_seen_at,
    lastUpdatedAt: topic.last_updated_at,
    storyAt: storedStoryAt ?? storyPick.iso,
    storyTimeKind: storedStoryKind ?? storyPick.kind,
    heatScore,
    scoreBreakdown,
    evidence,
    creatorAngle:
      typeof meta.creator_angle === "string" ? meta.creator_angle : null,
    investorWatchline:
      typeof meta.investor_watchline === "string" ? meta.investor_watchline : null,
    builderNote: buildBuilderNoteFromMeta(sectionKeys, topic.category, sourceSlugs),
    sectionAppearancesToday,
    rankingHistory: rankingRows.map((r) => ({
      rankingDate: r.ranking_date as string,
      section: r.section as RankingSection,
      heatScore: Number(r.heat_score),
      rankPosition: r.rank_position != null ? Number(r.rank_position) : null,
    })),
    tokens,
    protocols,
    timeline,
    sourceSnippets,
    headlineOnlySources,
    rankingDate: date,
    uniqueSourceCount: sourceSlugs.length,
    sourceImageUrl,
  };
}
