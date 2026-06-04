import type { SupabaseClient } from "@supabase/supabase-js";
import type { HeatCardView, HeatDashboardData } from "@/lib/types/heat";
import type { DailyRanking, Topic, Token, Protocol, RankingSection } from "@/lib/types/db";
import { SECTION_LABELS } from "@/lib/types/heat";
import { parseStoredEvidence } from "@/lib/process/build-evidence";
import { DASHBOARD_SECTIONS } from "@/lib/db/dashboard-sections";
import { utcAvailableDates, utcTodayIso } from "@/lib/heat/snapshot-date";
import { SECTION_LIMITS } from "@/lib/process/section-limits";

type RankingRow = DailyRanking & {
  topics: Topic & {
    topic_tokens?: Array<{ tokens: Token | null }>;
    topic_protocols?: Array<{ protocols: Protocol | null }>;
    topic_sources?: Array<{
      source_id: string;
      source_url: string | null;
      sources?: { name: string; slug: string } | null;
    }>;
  };
};

function compareRankings(a: RankingRow, b: RankingRow): number {
  const posA = a.rank_position ?? 9999;
  const posB = b.rank_position ?? 9999;
  if (posA !== posB) return posA - posB;

  const scoreDiff = Number(b.heat_score) - Number(a.heat_score);
  if (scoreDiff !== 0) return scoreDiff;

  return (
    new Date(b.topics.last_updated_at).getTime() -
    new Date(a.topics.last_updated_at).getTime()
  );
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
export async function fetchHeatDashboard(
  db: SupabaseClient,
  date?: string
): Promise<HeatDashboardData | null> {
  const rankingDate = date ?? utcTodayIso();

  const { data, error } = await db
    .from("daily_rankings")
    .select(
      `*,
      topics (
        *,
        topic_tokens ( tokens (*) ),
        topic_protocols ( protocols (*) ),
        topic_sources ( source_id, source_url, sources ( name, slug ) )
      )`
    )
    .eq("ranking_date", rankingDate)
    .eq("status", "published");

  if (error) return null;
  if (!data?.length) return null;

  const rows = data as RankingRow[];

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
