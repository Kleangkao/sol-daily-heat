import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchHeatDashboard } from "@/lib/db/queries/heat-today";
import { mergeDashboard } from "@/lib/db/merge-dashboard";
import { getDemoDashboard } from "@/lib/mock/demo-data";
import { DASHBOARD_SECTIONS } from "@/lib/db/dashboard-sections";
import { SECTION_LIMITS } from "@/lib/process/section-limits";
import { SOLANAFLOOR_SITEMAP_SLUG } from "@/lib/sources/sitemap-ingest-policy";
import {
  RAW_ITEMS_RETENTION_DAYS,
  INGEST_RUNS_RETENTION_DAYS,
} from "@/lib/db/retention-policy";
import {
  addToComposition,
  classifySectionCard,
  emptyComposition,
  type SectionComposition,
} from "@/lib/audit/classify-section-card";
import {
  WARN_CREATOR_SITEMAP_MAX,
  WARN_DAILY_RANKINGS_TOTAL,
  WARN_INGEST_RUNS_TOTAL,
  WARN_INVESTOR_METRIC_ONLY_MAX,
  WARN_RAW_ITEMS_OLDER_THAN_7D,
  WARN_RAW_ITEMS_TOTAL,
  WARN_SITEMAP_DUP_URL_GROUPS,
  WARN_TOP_HEAT_BOOST_MAX,
  WARN_TOP_HEAT_METRIC_ONLY_MAX,
  WARN_TOP_HEAT_SITEMAP_MAX,
  WARN_TOPICS_TOTAL,
  CRITICAL_SOURCE_SLUGS,
} from "@/lib/audit/thresholds";
import type { HeatCardView } from "@/lib/types/heat";
import type { RankingSection } from "@/lib/types/db";

export type LocalAuditReport = {
  generatedAt: string;
  rankingDate: string;
  rawItemsBySource7d: Array<{ slug: string; name: string; count: number }>;
  rankingsTodayBySection: Record<RankingSection, number>;
  sectionComposition: {
    top_heat: SectionComposition;
    builder_watch: SectionComposition;
    creator_angles: SectionComposition;
    investor_watchlist: SectionComposition;
  };
  solanafloorSitemap: {
    rawItemCount: number;
    uniqueCanonicalUrls: number;
    duplicateCanonicalUrlGroups: number;
    extraDuplicateRows: number;
    rankedTopicCount: number;
    headlineOnlyPrimaryCount: number;
    linkRowMismatchCount: number;
  };
  sourceHealth: {
    enabledSources: number;
    zeroItemsIn7d: string[];
    highVolume7d: Array<{ slug: string; count: number }>;
    sourcesInRankingsToday: string[];
  };
  supabaseGrowth: {
    raw_items: number;
    topics: number;
    daily_rankings: number;
    ingest_runs: number;
    tokens_with_mint_address: number;
  };
  retentionReadiness: {
    raw_items_older_than_retention_days: number;
    raw_items_retention_days: number;
    ingest_runs_older_than_retention_days: number;
    ingest_runs_retention_days: number;
  };
  dashboard: {
    dataSource: string;
    sectionSources: Record<string, string>;
    sectionCounts: Record<string, number>;
    rankingCapVsLimit: Record<string, { published: number; limit: number }>;
  };
  warnings: string[];
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function cutoffIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function compositionFromCards(cards: HeatCardView[]): SectionComposition {
  const comp = emptyComposition();
  for (const card of cards) {
    addToComposition(
      comp,
      classifySectionCard({
        title: card.title,
        sourceSlugs: card.sourceSlugs ?? [],
        itemTypes: card.itemTypes ?? [],
        rankingSignals: card.rankingSignals ?? [],
      })
    );
  }
  return comp;
}

function cardsForSection(
  live: Awaited<ReturnType<typeof fetchHeatDashboard>>,
  section: RankingSection
): HeatCardView[] {
  if (!live) return [];
  const map: Record<RankingSection, HeatCardView[]> = {
    top_heat: live.topHeat,
    new_tokens: live.newTokens,
    defi_signals: live.defiSignals,
    builder_watch: live.builderWatch,
    creator_angles: live.creatorAngles,
    investor_watchlist: live.investorWatchlist,
  };
  return map[section] ?? [];
}

export async function runLocalAudit(db: SupabaseClient): Promise<LocalAuditReport> {
  const rankingDate = todayDate();
  const cutoff7d = cutoffIso(7);
  const warnings: string[] = [];

  const { data: sources } = await db.from("sources").select("id,slug,name,is_enabled");

  const { data: rawRecent } = await db
    .from("raw_items")
    .select("source_id, canonical_url, fetched_at")
    .gte("fetched_at", cutoff7d);

  const sourceById = new Map(
    (sources ?? []).map((s) => [s.id as string, s as { slug: string; name: string }])
  );
  const count7d = new Map<string, number>();
  for (const row of rawRecent ?? []) {
    const src = sourceById.get((row as { source_id: string }).source_id);
    if (!src) continue;
    count7d.set(src.slug, (count7d.get(src.slug) ?? 0) + 1);
  }

  const rawItemsBySource7d = Array.from(count7d.entries())
    .map(([slug, count]) => {
      const src = (sources ?? []).find((s) => (s as { slug: string }).slug === slug) as
        | { name: string }
        | undefined;
      return { slug, name: src?.name ?? slug, count };
    })
    .sort((a, b) => b.count - a.count);

  for (const s of sources ?? []) {
    const slug = (s as { slug: string }).slug;
    if ((s as { is_enabled: boolean }).is_enabled && !count7d.has(slug)) {
      if ((CRITICAL_SOURCE_SLUGS as readonly string[]).includes(slug)) {
        warnings.push(`critical source "${slug}" has 0 raw_items in last 7d`);
      }
    }
  }

  const highVolume7d = rawItemsBySource7d.filter((r) => r.count >= 30);

  const { data: rankingsToday } = await db
    .from("daily_rankings")
    .select("section, topic_id, topics(topic_sources(sources(slug), is_primary))")
    .eq("ranking_date", rankingDate)
    .eq("status", "published");

  const rankingsTodayBySection: Record<RankingSection, number> = {
    top_heat: 0,
    new_tokens: 0,
    defi_signals: 0,
    builder_watch: 0,
    creator_angles: 0,
    investor_watchlist: 0,
  };

  const rankingSourceSlugs = new Set<string>();
  let headlineOnlyPrimaryCount = 0;
  let linkRowMismatchCount = 0;
  const rankedSitemapTopics = new Set<string>();

  for (const row of rankingsToday ?? []) {
    const section = row.section as RankingSection;
    rankingsTodayBySection[section] = (rankingsTodayBySection[section] ?? 0) + 1;

    const t = row.topics as {
      topic_sources?: Array<{
        sources?: { slug?: string };
        is_primary?: boolean;
        source_url?: string;
      }>;
    };
    const tsList = t?.topic_sources ?? [];
    const slugs = tsList.map((x) => x.sources?.slug).filter(Boolean) as string[];

    for (const s of slugs) rankingSourceSlugs.add(s);

    if (slugs.includes(SOLANAFLOOR_SITEMAP_SLUG)) {
      rankedSitemapTopics.add(row.topic_id as string);
      const urls = tsList
        .filter((x) => x.sources?.slug === SOLANAFLOOR_SITEMAP_SLUG)
        .map((x) => x.source_url?.toLowerCase())
        .filter(Boolean);
      const unique = new Set(urls).size;
      if (urls.length > unique) linkRowMismatchCount += 1;

      const hasFullEd = slugs.some((s) => s !== SOLANAFLOOR_SITEMAP_SLUG);
      const primary = tsList.find((x) => x.is_primary)?.sources?.slug;
      if (
        primary === SOLANAFLOOR_SITEMAP_SLUG ||
        (!hasFullEd && slugs.every((s) => s === SOLANAFLOOR_SITEMAP_SLUG))
      ) {
        headlineOnlyPrimaryCount += 1;
      }
    }
  }

  const live = await fetchHeatDashboard(db, rankingDate);
  const merged = mergeDashboard(live, getDemoDashboard(rankingDate));

  const sectionComposition = {
    top_heat: compositionFromCards(cardsForSection(live, "top_heat")),
    builder_watch: compositionFromCards(cardsForSection(live, "builder_watch")),
    creator_angles: compositionFromCards(cardsForSection(live, "creator_angles")),
    investor_watchlist: compositionFromCards(
      cardsForSection(live, "investor_watchlist")
    ),
  };

  const sitemapSource = (sources ?? []).find(
    (s) => (s as { slug: string }).slug === SOLANAFLOOR_SITEMAP_SLUG
  ) as { id: string } | undefined;

  let rawItemCount = 0;
  let duplicateCanonicalUrlGroups = 0;
  let extraDuplicateRows = 0;
  let uniqueCanonicalUrls = 0;

  if (sitemapSource?.id) {
    const { count } = await db
      .from("raw_items")
      .select("id", { count: "exact", head: true })
      .eq("source_id", sitemapSource.id);
    rawItemCount = count ?? 0;

    const { data: sfRows } = await db
      .from("raw_items")
      .select("canonical_url")
      .eq("source_id", sitemapSource.id);

    const urlCounts = new Map<string, number>();
    for (const r of sfRows ?? []) {
      const u = ((r as { canonical_url: string }).canonical_url ?? "")
        .trim()
        .toLowerCase();
      if (!u) continue;
      urlCounts.set(u, (urlCounts.get(u) ?? 0) + 1);
    }
    uniqueCanonicalUrls = urlCounts.size;
    for (const n of Array.from(urlCounts.values())) {
      if (n > 1) {
        duplicateCanonicalUrlGroups += 1;
        extraDuplicateRows += n - 1;
      }
    }
  }

  const tableCount = async (table: string) => {
    const { count, error } = await db
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) return -1;
    return count ?? 0;
  };

  const rawTotal = await tableCount("raw_items");
  const topicsTotal = await tableCount("topics");
  const rankingsTotal = await tableCount("daily_rankings");
  const ingestRunsTotal = await tableCount("ingest_runs");

  const { count: tokensWithMint } = await db
    .from("tokens")
    .select("id", { count: "exact", head: true })
    .not("mint_address", "is", null);

  const rawCutoff = cutoffIso(RAW_ITEMS_RETENTION_DAYS);
  const ingestCutoff = cutoffIso(INGEST_RUNS_RETENTION_DAYS);

  const { count: rawOld } = await db
    .from("raw_items")
    .select("id", { count: "exact", head: true })
    .lt("fetched_at", rawCutoff);

  const { count: ingestOld } = await db
    .from("ingest_runs")
    .select("id", { count: "exact", head: true })
    .lt("started_at", ingestCutoff);

  const rankingCapVsLimit: Record<string, { published: number; limit: number }> = {};
  for (const { dataKey, rankingSection } of DASHBOARD_SECTIONS) {
    const published = rankingsTodayBySection[rankingSection] ?? 0;
    const limit = SECTION_LIMITS[rankingSection];
    rankingCapVsLimit[dataKey] = { published, limit };
    if (published > limit) {
      warnings.push(
        `section ${rankingSection} published ${published} > cap ${limit}`
      );
    }
  }

  if (merged.dataSource !== "live") {
    warnings.push(`dashboard dataSource is "${merged.dataSource}" (expected "live")`);
  }
  if (sectionComposition.top_heat.sitemap_headline_only > WARN_TOP_HEAT_SITEMAP_MAX) {
    warnings.push(
      `top_heat sitemap_headline_only ${sectionComposition.top_heat.sitemap_headline_only} > ${WARN_TOP_HEAT_SITEMAP_MAX}`
    );
  }
  if (
    sectionComposition.creator_angles.sitemap_headline_only > WARN_CREATOR_SITEMAP_MAX
  ) {
    warnings.push(
      `creator_angles sitemap_headline_only ${sectionComposition.creator_angles.sitemap_headline_only} > ${WARN_CREATOR_SITEMAP_MAX}`
    );
  }
  if (
    sectionComposition.investor_watchlist.metric_only > WARN_INVESTOR_METRIC_ONLY_MAX
  ) {
    warnings.push(
      `investor_watchlist metric_only ${sectionComposition.investor_watchlist.metric_only} > ${WARN_INVESTOR_METRIC_ONLY_MAX}`
    );
  }
  if (sectionComposition.top_heat.boost_only > WARN_TOP_HEAT_BOOST_MAX) {
    warnings.push(
      `top_heat boost_only ${sectionComposition.top_heat.boost_only} > ${WARN_TOP_HEAT_BOOST_MAX}`
    );
  }
  if (sectionComposition.top_heat.metric_only > WARN_TOP_HEAT_METRIC_ONLY_MAX) {
    warnings.push(
      `top_heat metric_only ${sectionComposition.top_heat.metric_only} > ${WARN_TOP_HEAT_METRIC_ONLY_MAX}`
    );
  }
  if (duplicateCanonicalUrlGroups > WARN_SITEMAP_DUP_URL_GROUPS) {
    warnings.push(
      `solanafloor duplicate canonical_url groups: ${duplicateCanonicalUrlGroups}`
    );
  }
  if (linkRowMismatchCount > 0) {
    warnings.push(
      `solanafloor ranked topics with linked_rows > unique_urls: ${linkRowMismatchCount}`
    );
  }
  if (rawTotal > WARN_RAW_ITEMS_TOTAL) {
    warnings.push(`raw_items total ${rawTotal} > ${WARN_RAW_ITEMS_TOTAL}`);
  }
  if (topicsTotal > WARN_TOPICS_TOTAL) {
    warnings.push(`topics total ${topicsTotal} > ${WARN_TOPICS_TOTAL}`);
  }
  if (rankingsTotal > WARN_DAILY_RANKINGS_TOTAL) {
    warnings.push(`daily_rankings total ${rankingsTotal} > ${WARN_DAILY_RANKINGS_TOTAL}`);
  }
  if (ingestRunsTotal > WARN_INGEST_RUNS_TOTAL) {
    warnings.push(`ingest_runs total ${ingestRunsTotal} > ${WARN_INGEST_RUNS_TOTAL}`);
  }
  if ((rawOld ?? 0) > WARN_RAW_ITEMS_OLDER_THAN_7D) {
    warnings.push(
      `raw_items older than ${RAW_ITEMS_RETENTION_DAYS}d: ${rawOld} (run cleanup:local --dry-run)`
    );
  }

  const zeroItemsIn7d = (sources ?? [])
    .filter((s) => (s as { is_enabled: boolean }).is_enabled)
    .map((s) => (s as { slug: string }).slug)
    .filter((slug) => !count7d.has(slug));

  return {
    generatedAt: new Date().toISOString(),
    rankingDate,
    rawItemsBySource7d,
    rankingsTodayBySection,
    sectionComposition,
    solanafloorSitemap: {
      rawItemCount,
      uniqueCanonicalUrls,
      duplicateCanonicalUrlGroups,
      extraDuplicateRows,
      rankedTopicCount: rankedSitemapTopics.size,
      headlineOnlyPrimaryCount,
      linkRowMismatchCount,
    },
    sourceHealth: {
      enabledSources: (sources ?? []).filter((s) => (s as { is_enabled: boolean }).is_enabled)
        .length,
      zeroItemsIn7d,
      highVolume7d: highVolume7d.map((r) => ({ slug: r.slug, count: r.count })),
      sourcesInRankingsToday: Array.from(rankingSourceSlugs).sort(),
    },
    supabaseGrowth: {
      raw_items: rawTotal,
      topics: topicsTotal,
      daily_rankings: rankingsTotal,
      ingest_runs: ingestRunsTotal,
      tokens_with_mint_address: tokensWithMint ?? 0,
    },
    retentionReadiness: {
      raw_items_older_than_retention_days: rawOld ?? 0,
      raw_items_retention_days: RAW_ITEMS_RETENTION_DAYS,
      ingest_runs_older_than_retention_days: ingestOld ?? 0,
      ingest_runs_retention_days: INGEST_RUNS_RETENTION_DAYS,
    },
    dashboard: {
      dataSource: merged.dataSource ?? "unknown",
      sectionSources: merged.sectionSources ?? {},
      sectionCounts: {
        topHeat: merged.topHeat.length,
        newTokens: merged.newTokens.length,
        defiSignals: merged.defiSignals.length,
        builderWatch: merged.builderWatch.length,
        creatorAngles: merged.creatorAngles.length,
        investorWatchlist: merged.investorWatchlist.length,
      },
      rankingCapVsLimit,
    },
    warnings,
  };
}
