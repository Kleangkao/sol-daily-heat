import type { SupabaseClient } from "@supabase/supabase-js";
import type { HeatCardView, HeatDashboardData } from "@/lib/types/heat";
import type { DailyRanking, Topic, Token, Protocol, RankingSection } from "@/lib/types/db";
import { SECTION_LABELS } from "@/lib/types/heat";
import { parseStoredEvidence } from "@/lib/process/build-evidence";
import { DASHBOARD_SECTIONS } from "@/lib/db/dashboard-sections";
import { utcAvailableDates, utcTodayIso } from "@/lib/heat/snapshot-date";
import { SECTION_LIMITS } from "@/lib/process/section-limits";
import {
  pickStoryTimestampFromSources,
  readStoredStoryAt,
  readStoredStoryTimeKind,
  resolveStoryTimeKind,
} from "@/lib/heat/story-timestamp";

type RankingRow = DailyRanking & {
  topics: Topic & {
    topic_tokens?: Array<{ tokens: Token | null }>;
    topic_protocols?: Array<{ protocols: Protocol | null }>;
    topic_sources?: Array<{
      source_id: string;
      source_url: string | null;
      sources?: { name: string; slug: string; reliability?: number } | null;
      raw_items?: {
        published_at: string | null;
        fetched_at: string;
        metadata_json?: Record<string, unknown> | null;
      } | null;
    }>;
  };
};

function compareRankings(a: RankingRow, b: RankingRow): number {
  const posA = a.rank_position ?? 9999;
  const posB = b.rank_position ?? 9999;
  if (posA !== posB) return posA - posB;

  const scoreDiff = Number(b.heat_score) - Number(a.heat_score);
  if (scoreDiff !== 0) return scoreDiff;

  const storyA = readStoredStoryAt(a.topics.metadata_json ?? {}) ?? a.topics.last_updated_at;
  const storyB = readStoredStoryAt(b.topics.metadata_json ?? {}) ?? b.topics.last_updated_at;
  return new Date(storyB).getTime() - new Date(storyA).getTime();
}

function resolveCardStory(
  t: RankingRow["topics"],
  meta: Record<string, unknown>,
  itemTypes: string[],
  rankingSignals: string[]
): { storyAt: string; storyTimeKind: ReturnType<typeof resolveStoryTimeKind> } {
  const storedAt = readStoredStoryAt(meta);
  const storedKind = readStoredStoryTimeKind(meta);
  if (storedAt && storedKind) {
    return { storyAt: storedAt, storyTimeKind: storedKind };
  }

  const sourceInputs =
    t.topic_sources?.map((ts) => {
      const raw = ts.raw_items;
      const signal =
        typeof raw?.metadata_json?.signal === "string"
          ? raw.metadata_json.signal
          : null;
      return {
        publishedAt: raw?.published_at ?? null,
        fetchedAt: raw?.fetched_at,
        reliability: ts.sources?.reliability ?? null,
        itemType:
          typeof raw?.metadata_json?.item_type === "string"
            ? raw.metadata_json.item_type
            : null,
        signal,
      };
    }) ?? [];

  const picked = pickStoryTimestampFromSources(
    sourceInputs,
    itemTypes,
    rankingSignals,
    t.first_seen_at
  );

  return {
    storyAt: storedAt ?? picked.iso,
    storyTimeKind: storedKind ?? picked.kind,
  };
}

function fallbackEvidence(
  t: RankingRow["topics"],
  row: RankingRow,
  meta: Record<string, unknown>
): HeatCardView["evidence"] {
  const links: Array<{ label: string; url: string }> = [];
  for (const ts of t.topic_sources ?? []) {
    const url = ts.source_url?.trim();
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const label = ts.sources?.name ?? "Source";
    if (!links.some((l) => l.url === url)) links.push({ label, url });
  }

  return {
    whatHappened: t.summary ?? "",
    evidenceItems: [],
    sourceLinks: links,
    signalBreakdown: Object.entries(row.score_breakdown_json ?? {})
      .filter(([, v]) => typeof v === "number" && v > 0)
      .map(([key, points]) => ({
        key,
        label: key.replace(/_/g, " "),
        points: points as number,
        kind: "interpretation" as const,
      })),
    interpretationNote:
      t.interpretation_type === "ai"
        ? "AI-assisted summary when configured; rank is rule-based."
        : "Rule-based summary and heat rank — not investment advice.",
    watchNext: "Watch for follow-up signals and primary-source confirmation.",
    factVsInterpretation: {
      facts: [t.title],
      interpretations: [t.why_hot ?? "", String(meta.creator_angle ?? "")].filter(Boolean),
    },
  };
}

function rankingToCard(row: RankingRow): HeatCardView {
  const t = row.topics;
  const meta = t.metadata_json ?? {};
  const rankingMeta = (row.metadata_json ?? {}) as Record<string, unknown>;
  const evidence =
    parseStoredEvidence(meta.evidence) ?? fallbackEvidence(t, row, meta);

  const sourceSlugs = Array.from(
    new Set(
      (t.topic_sources ?? [])
        .map((ts) => ts.sources?.slug)
        .filter((s): s is string => Boolean(s))
    )
  );
  const itemTypes = Array.isArray(meta.item_types)
    ? (meta.item_types as string[])
    : [];
  const rankingSignals = Array.isArray(rankingMeta.signals)
    ? (rankingMeta.signals as string[])
    : [];
  const { storyAt, storyTimeKind } = resolveCardStory(t, meta, itemTypes, rankingSignals);

  return {
    id: t.id,
    title: t.title,
    summary: t.summary ?? "",
    category: t.category,
    heatScore: Number(row.heat_score),
    sourceCount:
      typeof meta.display_source_count === "number"
        ? meta.display_source_count
        : t.topic_sources?.length ?? 1,
    firstSeen: t.first_seen_at,
    lastUpdated: t.last_updated_at,
    storyAt,
    storyTimeKind,
    whyHot: t.why_hot ?? "Clustered signals.",
    relatedTokens:
      t.topic_tokens?.map((tt) => ({
        symbol: tt.tokens?.symbol ?? "?",
        name: tt.tokens?.name ?? undefined,
        mintAddress: tt.tokens?.mint_address ?? undefined,
      })) ?? [],
    relatedProjects:
      t.topic_protocols?.map((tp) => ({
        name: tp.protocols?.name ?? "Unknown",
        slug: tp.protocols?.slug,
        type: "protocol" as const,
      })) ?? [],
    riskNote: t.risk_note ?? "Not investment advice.",
    interpretationType: t.interpretation_type,
    confidence: Number(row.confidence_score ?? t.confidence_score),
    scoreBreakdown: row.score_breakdown_json as Record<string, number>,
    sectionLabel: SECTION_LABELS[row.section],
    creatorAngle: typeof meta.creator_angle === "string" ? meta.creator_angle : undefined,
    investorWatchline:
      typeof meta.investor_watchline === "string" ? meta.investor_watchline : undefined,
    rankPosition: row.rank_position,
    // is_carryover = returning story with new development today (shown, not hidden)
    isUpdatedStory: row.is_carryover,
    evidence,
    sourceSlugs,
    itemTypes,
    rankingSignals,
  };
}

function rowsForSection(rows: RankingRow[], section: RankingSection): HeatCardView[] {
  return rows
    .filter((r) => r.section === section)
    .sort(compareRankings)
    .slice(0, SECTION_LIMITS[section])
    .map(rankingToCard);
}

/**
 * Load live rankings for a date. Returns null only on DB error or zero rows.
 * Empty individual sections are returned as [] (caller merges mock per section).
 */
async function hydrateRankingRows(
  db: SupabaseClient,
  rows: RankingRow[]
): Promise<RankingRow[]> {
  const topicIds = Array.from(new Set(rows.map((r) => r.topics?.id).filter(Boolean))) as string[];
  if (topicIds.length === 0) return rows;

  const [tokensRes, protocolsRes, sourcesRes] = await Promise.all([
    db.from("topic_tokens").select("topic_id, tokens (*)").in("topic_id", topicIds),
    db.from("topic_protocols").select("topic_id, protocols (*)").in("topic_id", topicIds),
    db
      .from("topic_sources")
      .select(
        "topic_id, source_id, source_url, raw_items ( published_at, fetched_at, metadata_json ), sources ( name, slug, reliability )"
      )
      .in("topic_id", topicIds),
  ]);

  if (tokensRes.error) throw new Error(`topic_tokens hydrate failed: ${tokensRes.error.message}`);
  if (protocolsRes.error) {
    throw new Error(`topic_protocols hydrate failed: ${protocolsRes.error.message}`);
  }
  if (sourcesRes.error) throw new Error(`topic_sources hydrate failed: ${sourcesRes.error.message}`);

  type TokenLink = NonNullable<RankingRow["topics"]["topic_tokens"]>[number];
  type ProtocolLink = NonNullable<RankingRow["topics"]["topic_protocols"]>[number];
  type SourceLink = NonNullable<RankingRow["topics"]["topic_sources"]>[number];

  const tokensByTopic = new Map<string, TokenLink[]>();
  for (const row of tokensRes.data ?? []) {
    const topicId = row.topic_id as string;
    const bucket = tokensByTopic.get(topicId) ?? [];
    bucket.push({ tokens: (row.tokens as unknown as Token | null) ?? null });
    tokensByTopic.set(topicId, bucket);
  }

  const protocolsByTopic = new Map<string, ProtocolLink[]>();
  for (const row of protocolsRes.data ?? []) {
    const topicId = row.topic_id as string;
    const bucket = protocolsByTopic.get(topicId) ?? [];
    bucket.push({ protocols: (row.protocols as unknown as Protocol | null) ?? null });
    protocolsByTopic.set(topicId, bucket);
  }

  const sourcesByTopic = new Map<string, SourceLink[]>();
  for (const row of sourcesRes.data ?? []) {
    const topicId = row.topic_id as string;
    const bucket = sourcesByTopic.get(topicId) ?? [];
    bucket.push({
      source_id: row.source_id as string,
      source_url: row.source_url as string | null,
      sources:
        (row.sources as unknown as {
          name: string;
          slug: string;
          reliability?: number;
        } | null) ?? null,
      raw_items:
        (row.raw_items as unknown as NonNullable<SourceLink["raw_items"]>) ?? null,
    });
    sourcesByTopic.set(topicId, bucket);
  }

  return rows.map((row) => ({
    ...row,
    topics: {
      ...row.topics,
      topic_tokens: tokensByTopic.get(row.topics.id) ?? [],
      topic_protocols: protocolsByTopic.get(row.topics.id) ?? [],
      topic_sources: sourcesByTopic.get(row.topics.id) ?? [],
    },
  }));
}

export async function fetchHeatDashboard(
  db: SupabaseClient,
  date?: string
): Promise<HeatDashboardData | null> {
  const rankingDate = date ?? utcTodayIso();

  const { data, error } = await db
    .from("daily_rankings")
    .select(`*, topics (*)`)
    .eq("ranking_date", rankingDate)
    .eq("status", "published");

  if (error) {
    throw new Error(`fetchHeatDashboard failed: ${error.message}`);
  }
  if (!data?.length) return null;

  const rows = await hydrateRankingRows(db, data as RankingRow[]);

  const topHeat = rowsForSection(rows, "top_heat");
  const newTokens = rowsForSection(rows, "new_tokens");
  const defiSignals = rowsForSection(rows, "defi_signals");
  const builderWatch = rowsForSection(rows, "builder_watch");
  let creatorAngles = rowsForSection(rows, "creator_angles");
  let investorWatchlist = rowsForSection(rows, "investor_watchlist");

  if (creatorAngles.length === 0) {
    creatorAngles = topHeat.slice(0, 3).map((c) => ({
      ...c,
      summary: c.creatorAngle ?? c.summary,
    }));
  }
  if (investorWatchlist.length === 0) {
    investorWatchlist = topHeat.slice(0, 4).map((c) => ({
      ...c,
      summary: c.investorWatchline ?? c.summary,
    }));
  }

  return {
    date: rankingDate,
    availableDates: utcAvailableDates(),
    topHeat,
    newTokens,
    defiSignals,
    builderWatch,
    creatorAngles,
    investorWatchlist,
    dataSource: "live",
    sectionSources: Object.fromEntries(
      DASHBOARD_SECTIONS.map(({ dataKey }) => [dataKey, "live" as const])
    ),
  };
}
