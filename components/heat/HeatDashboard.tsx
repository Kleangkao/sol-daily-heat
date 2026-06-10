"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { filterByCategory } from "@/lib/mock/demo-data";
import {
  buildDashboardQueryString,
  isValidDateParam,
  parseCategoryParam,
  resolveDateParam,
} from "@/lib/heat/dashboard-url-state";
import {
  deriveActiveExploreChip,
  resolveExploreChipAction,
  type ExploreChipId,
} from "@/lib/heat/explore-navigation";
import { parseSectionHash } from "@/lib/heat/section-collapse";
import { buildTopicSectionLabels } from "@/lib/heat/topic-section-appearances";
import { utcAvailableDates, utcTodayIso } from "@/lib/heat/snapshot-date";
import type { HeatDashboardData, DashboardSectionKey } from "@/lib/types/heat";
import type { TopicCategory } from "@/lib/types/db";
import { CATEGORY_LABELS } from "@/lib/types/heat";
import { SECTION_LIMITS } from "@/lib/process/section-limits";
import { sectionItemsMetricHeavy } from "@/lib/heat/card-display";
import DashboardLoadingShell from "./DashboardLoadingShell";
import DemoPreviewBanner from "./DemoPreviewBanner";
import ExploreBar from "./ExploreBar";
import HeatHero from "./HeatHero";
import HeatSection from "./HeatSection";
import MarketPulse from "./MarketPulse";
import PastSnapshotsNav from "./PastSnapshotsNav";
import { useSectionOpenState } from "./useSectionOpenState";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HeatDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCategoryFilter = parseCategoryParam(searchParams.get("category"));
  const initialDateRaw = searchParams.get("date");

  const [date, setDate] = useState<string | undefined>(() =>
    isValidDateParam(initialDateRaw) ? initialDateRaw! : undefined
  );
  const [categoryFilter, setCategoryFilter] = useState<TopicCategory | null>(
    initialCategoryFilter
  );
  const [activeExploreChip, setActiveExploreChip] = useState<ExploreChipId>(() =>
    deriveActiveExploreChip(initialCategoryFilter, null)
  );
  const { open: sectionOpen, toggleSection, navigateToSection, navigateToSections } =
    useSectionOpenState();

  useEffect(() => {
    const hash = parseSectionHash(window.location.hash);
    setActiveExploreChip(deriveActiveExploreChip(categoryFilter, hash));
  }, [categoryFilter]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = parseSectionHash(window.location.hash);
      setActiveExploreChip(deriveActiveExploreChip(categoryFilter, hash));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [categoryFilter]);

  const apiUrl = date ? `/api/heat/today?date=${date}` : "/api/heat/today";

  const { data, isLoading, isValidating } = useSWR<HeatDashboardData>(apiUrl, fetcher, {
    revalidateOnFocus: false,
  });

  const awaitingData = data == null && (isLoading || isValidating);
  const dashboard = data ?? null;

  const syncUrl = useCallback(
    (nextDate: string | undefined, nextCategory: TopicCategory | null) => {
      const qs = buildDashboardQueryString(nextDate, nextCategory);
      router.replace(`/${qs}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    const raw = searchParams.get("date");
    if (isValidDateParam(raw)) {
      setDate(raw!);
    } else if (!raw) {
      setDate(undefined);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!dashboard?.availableDates?.length) return;
    const raw = searchParams.get("date");
    if (!raw || !isValidDateParam(raw)) return;
    const resolved = resolveDateParam(raw, dashboard.availableDates);
    if (resolved && resolved !== raw) {
      setDate(resolved);
      syncUrl(resolved, categoryFilter);
    }
  }, [dashboard, searchParams, categoryFilter, syncUrl]);

  const onExploreChip = useCallback(
    (chipId: ExploreChipId) => {
      setActiveExploreChip(chipId);
      const action = resolveExploreChipAction(chipId);

      switch (action.type) {
        case "clear-category":
          setCategoryFilter(null);
          syncUrl(date, null);
          navigateToSection(action.scrollTo);
          break;
        case "section-only":
          navigateToSection(action.section);
          break;
        case "category-lens":
          setCategoryFilter(action.category);
          syncUrl(date, action.category);
          navigateToSection(action.scrollTo);
          break;
        case "defi-hybrid":
          setCategoryFilter(action.category);
          syncUrl(date, action.category);
          navigateToSections(action.openSections, action.scrollTo);
          break;
      }
    },
    [date, syncUrl, navigateToSection, navigateToSections]
  );

  const archiveDate =
    date != null && date !== utcTodayIso() ? date : undefined;

  const pastSnapshotDates = useMemo(() => {
    const today = utcTodayIso();
    const source = dashboard?.availableDates ?? utcAvailableDates();
    return source.filter((d) => d !== today);
  }, [dashboard?.availableDates]);

  const topFiltered = useMemo(() => {
    if (!dashboard) return [];
    if (categoryFilter === null) return dashboard.topHeat;
    return filterByCategory(dashboard.topHeat, categoryFilter);
  }, [dashboard, categoryFilter]);

  const topicSections = useMemo(
    () => (dashboard ? buildTopicSectionLabels(dashboard) : undefined),
    [dashboard]
  );

  const topHeatEmptyMessage = useMemo(() => {
    if (!dashboard) return "No topics match this category filter.";
    if (categoryFilter === null) return "No Top Heat topics for this snapshot.";
    const snapshot = dashboard.date;
    const curatedNote = " Other sections below are curated separately.";
    const label = CATEGORY_LABELS[categoryFilter];
    return `No Top Heat topics matched ${label} for snapshot ${snapshot} UTC.${curatedNote}`;
  }, [dashboard, categoryFilter]);

  const newTokenMints = useMemo(() => {
    const set = new Set<string>();
    for (const card of dashboard?.newTokens ?? []) {
      for (const t of card.relatedTokens) {
        if (t.mintAddress) set.add(t.mintAddress);
      }
    }
    return set;
  }, [dashboard?.newTokens]);

  const sectionSource = (key: DashboardSectionKey) => dashboard?.sectionSources?.[key];

  const creatorSparse =
    dashboard != null &&
    dashboard.creatorAngles.length > 0 &&
    dashboard.creatorAngles.length < SECTION_LIMITS.creator_angles;
  const investorMetricHeavy =
    dashboard != null && sectionItemsMetricHeavy(dashboard.investorWatchlist);
  const builderSparse =
    dashboard != null &&
    dashboard.builderWatch.length > 0 &&
    dashboard.builderWatch.length < SECTION_LIMITS.builder_watch;

  const footerLabel =
    dashboard?.dataSource === "live"
      ? "Live rankings from Supabase"
      : dashboard?.dataSource === "mixed"
        ? "Mixed: live Supabase data where available; sections marked (demo) use mock data"
        : dashboard
          ? "Demo mock data"
          : "";

  return (
    <div className="min-h-screen">
      <HeatHero archiveDate={archiveDate} />
      {dashboard && dashboard.dataSource && dashboard.dataSource !== "live" ? (
        <DemoPreviewBanner
          dataSource={dashboard.dataSource}
          snapshotDate={dashboard.date}
        />
      ) : null}
      {awaitingData ? (
        <DashboardLoadingShell />
      ) : dashboard ? (
        <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
          <div className="lg:hidden">
            <MarketPulse
              layout="mobile"
              heatDataSource={dashboard.dataSource}
              newTokenMints={newTokenMints}
            />
          </div>

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_252px] lg:items-start lg:gap-8">
            <div className="min-w-0">
              <ExploreBar activeChip={activeExploreChip} onChipClick={onExploreChip} />

              <HeatSection
                title="| Top Heat"
                sectionId="top-heat"
                sectionLabel="Top Heat"
                topicSections={topicSections}
                description="Highest rule-based heat scores for the selected UTC snapshot, deduplicated for that day."
                items={topFiltered}
                emptyMessage={topHeatEmptyMessage}
                sectionDataSource={sectionSource("topHeat")}
                isOpen={sectionOpen["top-heat"]}
                onToggle={() => toggleSection("top-heat")}
              />

              <HeatSection
                title="New Solana Tokens"
                sectionId="new-tokens"
                sectionLabel="New Tokens"
                topicSections={topicSections}
                description="New pair and mint signals from DexScreener-style adapters (24h window, UTC snapshot day)."
                items={dashboard.newTokens}
                sectionDataSource={sectionSource("newTokens")}
                isOpen={sectionOpen["new-tokens"]}
                onToggle={() => toggleSection("new-tokens")}
              />

              <HeatSection
                title="DeFi / Protocol Signals"
                sectionId="defi"
                sectionLabel="DeFi"
                topicSections={topicSections}
                description="Protocol TVL, volume, and stake-flow context from free DeFi adapters."
                items={dashboard.defiSignals}
                sectionDataSource={sectionSource("defiSignals")}
                isOpen={sectionOpen.defi}
                onToggle={() => toggleSection("defi")}
              />

              <HeatSection
                title="Builder / Infra Watch"
                sectionId="builder"
                sectionLabel="Builder"
                topicSections={topicSections}
                description="Infrastructure, developer tooling, protocol plumbing, and status signals for Solana builders."
                items={dashboard.builderWatch}
                sectionDataSource={sectionSource("builderWatch")}
                sparseNote={
                  builderSparse
                    ? "Only builder-relevant infra, tooling, and status signals are shown."
                    : undefined
                }
                sectionDisclaimer="Operational and ecosystem context. Not investment advice."
                isOpen={sectionOpen.builder}
                onToggle={() => toggleSection("builder")}
              />

              <HeatSection
                title="Creator Angles"
                sectionId="creator"
                sectionLabel="Creator"
                topicSections={topicSections}
                description="Thread and clip starting points derived from the UTC snapshot. Add your own verification."
                items={dashboard.creatorAngles}
                sectionDataSource={sectionSource("creatorAngles")}
                personaHighlight="creator"
                sparseNote={
                  creatorSparse
                    ? "Only high-confidence narrative angles are shown."
                    : undefined
                }
                isOpen={sectionOpen.creator}
                onToggle={() => toggleSection("creator")}
              />

              <HeatSection
                title="Investor Watchlist"
                sectionId="investor"
                sectionLabel="Investor"
                topicSections={topicSections}
                description="Neutral watch context for builders and investors."
                items={dashboard.investorWatchlist}
                sectionDataSource={sectionSource("investorWatchlist")}
                personaHighlight="investor"
                sectionDisclaimer={
                  investorMetricHeavy
                    ? "Watchlist items are signals, not recommendations."
                    : undefined
                }
                isOpen={sectionOpen.investor}
                onToggle={() => toggleSection("investor")}
              />

              <footer className="mt-16 border-t border-border py-8 text-center text-[12px] text-text-muted">
                <p>
                  {footerLabel} · <code className="text-accent">not investment advice</code>
                </p>
                <PastSnapshotsNav dates={pastSnapshotDates} activeDate={date} />
              </footer>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-4">
                <MarketPulse
                  layout="rail"
                  heatDataSource={dashboard.dataSource}
                  newTokenMints={newTokenMints}
                />
              </div>
            </aside>
          </div>
        </main>
      ) : null}
    </div>
  );
}
