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
import { buildTopicSectionLabels } from "@/lib/heat/topic-section-appearances";
import { utcAvailableDates, utcTodayIso } from "@/lib/heat/snapshot-date";
import type {
  HeatCategoryFilter,
  HeatDashboardData,
  DashboardSectionKey,
} from "@/lib/types/heat";
import { CATEGORY_LABELS } from "@/lib/types/heat";
import { SECTION_LIMITS } from "@/lib/process/section-limits";
import { sectionItemsMetricHeavy } from "@/lib/heat/card-display";
import CategoryFilter from "./CategoryFilter";
import DashboardLoadingShell from "./DashboardLoadingShell";
import DemoPreviewBanner from "./DemoPreviewBanner";
import DisclaimerBar from "./DisclaimerBar";
import HeatHero from "./HeatHero";
import HeatSection from "./HeatSection";
import MarketPulse from "./MarketPulse";
import SectionJumpNav from "./SectionJumpNav";
import { useSectionOpenState } from "./useSectionOpenState";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HeatDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCategory = parseCategoryParam(searchParams.get("category"));
  const initialDateRaw = searchParams.get("date");

  const [date, setDate] = useState<string | undefined>(() =>
    isValidDateParam(initialDateRaw) ? initialDateRaw! : undefined
  );
  const [category, setCategory] = useState<HeatCategoryFilter>(initialCategory);
  const { open: sectionOpen, toggleSection, navigateToSection } = useSectionOpenState();

  const heroDate = date ?? utcTodayIso();
  const heroDates = useMemo(() => utcAvailableDates(), []);

  const apiUrl = date ? `/api/heat/today?date=${date}` : "/api/heat/today";

  const { data, isLoading, isValidating } = useSWR<HeatDashboardData>(apiUrl, fetcher, {
    revalidateOnFocus: false,
  });

  const awaitingData = data == null && (isLoading || isValidating);
  const dashboard = data ?? null;

  const syncUrl = useCallback(
    (nextDate: string | undefined, nextCategory: HeatCategoryFilter) => {
      const effectiveDate = nextDate ?? dashboard?.date ?? utcTodayIso();
      const qs = buildDashboardQueryString(effectiveDate, nextCategory);
      router.replace(`/${qs}`, { scroll: false });
    },
    [router, dashboard?.date]
  );

  useEffect(() => {
    if (!dashboard?.availableDates?.length) return;
    const raw = searchParams.get("date");
    if (!raw || !isValidDateParam(raw)) return;
    const resolved = resolveDateParam(raw, dashboard.availableDates);
    if (resolved && resolved !== raw) {
      setDate(resolved);
      syncUrl(resolved, category);
    }
  }, [dashboard, searchParams, category, syncUrl]);

  const onDateChange = useCallback(
    (d: string) => {
      setDate(d);
      syncUrl(d, category);
    },
    [category, syncUrl]
  );

  const onCategoryChange = useCallback(
    (c: HeatCategoryFilter) => {
      setCategory(c);
      syncUrl(date ?? dashboard?.date, c);
    },
    [date, dashboard?.date, syncUrl]
  );

  const topFiltered = useMemo(
    () => (dashboard ? filterByCategory(dashboard.topHeat, category) : []),
    [dashboard, category]
  );

  const topicSections = useMemo(
    () => (dashboard ? buildTopicSectionLabels(dashboard) : undefined),
    [dashboard]
  );

  const topHeatEmptyMessage = useMemo(() => {
    if (!dashboard) return "No topics match this category filter.";
    const snapshot = dashboard.date;
    const curatedNote = " Other sections below are curated separately.";
    if (category === "all") {
      return `No Top Heat topics for snapshot ${snapshot} UTC.${curatedNote}`;
    }
    const label = CATEGORY_LABELS[category];
    return `No Top Heat topics matched ${label} for snapshot ${snapshot} UTC.${curatedNote}`;
  }, [dashboard, category]);

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
      <HeatHero
        date={dashboard?.date ?? heroDate}
        dates={dashboard?.availableDates ?? heroDates}
        onDateChange={onDateChange}
        dataSource={dashboard?.dataSource}
        isLoading={awaitingData}
      />
      <DisclaimerBar dataSource={dashboard?.dataSource} isLoading={awaitingData} />
      {dashboard && dashboard.dataSource && dashboard.dataSource !== "live" ? (
        <DemoPreviewBanner
          dataSource={dashboard.dataSource}
          snapshotDate={dashboard.date}
        />
      ) : null}
      {awaitingData ? (
        <DashboardLoadingShell />
      ) : dashboard ? (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <MarketPulse
            layout="mobile"
            heatDataSource={dashboard.dataSource}
            newTokenMints={newTokenMints}
          />

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_252px] lg:items-start lg:gap-8">
            <div className="min-w-0">
              <div className="mb-5 space-y-4 rounded-[10px] border border-border/60 bg-bg-card/40 p-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Categories
                  </p>
                  <p className="mt-0.5 mb-2 text-[11px] leading-relaxed text-text-muted">
                    Filters Top Heat by topic. Persona sections below stay curated separately.
                  </p>
                  <CategoryFilter value={category} onChange={onCategoryChange} />
                </div>

                <div className="border-t border-border/60 pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Sections
                  </p>
                  <p className="mt-0.5 mb-2 text-[11px] text-text-muted">
                    Jump to a dashboard section.
                  </p>
                  <SectionJumpNav onNavigate={navigateToSection} />
                </div>
              </div>

              <p className="mb-6 text-[12px] text-text-muted">
                A topic may appear in multiple sections when it matters to different audiences.
              </p>

              <HeatSection
            title="Top Heat"
            sectionId="top-heat"
            sectionLabel="Top Heat"
            topicSections={topicSections}
            description="Highest rule-based heat scores for the selected UTC snapshot — deduplicated for that day."
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
            sectionDisclaimer="Operational and ecosystem context — not investment advice."
            isOpen={sectionOpen.builder}
            onToggle={() => toggleSection("builder")}
          />

          <HeatSection
            title="Creator Angles"
            sectionId="creator"
            sectionLabel="Creator"
            topicSections={topicSections}
            description="Thread and clip starting points derived from the UTC snapshot — add your own verification."
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
                {footerLabel} · <code className="text-accent">not investment advice</code>
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
