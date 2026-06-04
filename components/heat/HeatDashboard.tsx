"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { filterByCategory } from "@/lib/mock/demo-data";
import { utcAvailableDates, utcTodayIso } from "@/lib/heat/snapshot-date";
import type {
  HeatCategoryFilter,
  HeatDashboardData,
  DashboardSectionKey,
} from "@/lib/types/heat";
import { SECTION_LIMITS } from "@/lib/process/section-limits";
import { sectionItemsMetricHeavy } from "@/lib/heat/card-display";
import CategoryFilter from "./CategoryFilter";
import DashboardLoadingShell from "./DashboardLoadingShell";
import DemoPreviewBanner from "./DemoPreviewBanner";
import DisclaimerBar from "./DisclaimerBar";
import HeatHero from "./HeatHero";
import HeatSection from "./HeatSection";
import MarketPulse from "./MarketPulse";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HeatDashboard() {
  const [date, setDate] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<HeatCategoryFilter>("all");

  const heroDate = date ?? utcTodayIso();
  const heroDates = useMemo(() => utcAvailableDates(), []);

  const apiUrl = date ? `/api/heat/today?date=${date}` : "/api/heat/today";

  const { data, isLoading, isValidating } = useSWR<HeatDashboardData>(apiUrl, fetcher, {
    revalidateOnFocus: false,
  });

  const awaitingData = data == null && (isLoading || isValidating);
  const dashboard = data ?? null;

  const topFiltered = useMemo(
    () => (dashboard ? filterByCategory(dashboard.topHeat, category) : []),
    [dashboard, category]
  );

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
        onDateChange={(d) => setDate(d)}
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
      <MarketPulse heatDataSource={dashboard?.dataSource} />

      {awaitingData ? (
        <DashboardLoadingShell />
      ) : dashboard ? (
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <p className="mb-2 text-[12px] font-medium text-text-secondary">
              Top Heat category filter
            </p>
            <CategoryFilter value={category} onChange={setCategory} />
            <p className="mt-1.5 text-[11px] text-text-muted">
              Other sections are curated separately.
            </p>
          </div>

          <HeatSection
            title="Top Heat"
            description="Highest rule-based heat scores for the selected UTC snapshot — deduplicated for that day."
            items={topFiltered}
            emptyMessage="No topics match this category filter."
            sectionDataSource={sectionSource("topHeat")}
          />

          <HeatSection
            title="New Solana Tokens"
            description="New pair and mint signals from DexScreener-style adapters (24h window, UTC snapshot day)."
            items={dashboard.newTokens}
            sectionDataSource={sectionSource("newTokens")}
          />

          <HeatSection
            title="DeFi / Protocol Signals"
            description="Protocol TVL, volume, and stake-flow context from free DeFi adapters."
            items={dashboard.defiSignals}
            sectionDataSource={sectionSource("defiSignals")}
          />

          <HeatSection
            title="Builder / Infra Watch"
            description="Infrastructure, developer tooling, protocol plumbing, and status signals for Solana builders."
            items={dashboard.builderWatch}
            sectionDataSource={sectionSource("builderWatch")}
            sparseNote={
              builderSparse
                ? "Only builder-relevant infra, tooling, and status signals are shown."
                : undefined
            }
            sectionDisclaimer="Operational and ecosystem context — not investment advice."
          />

          <HeatSection
            title="Creator Angles"
            description="Thread and clip starting points derived from the UTC snapshot — add your own verification."
            items={dashboard.creatorAngles}
            sectionDataSource={sectionSource("creatorAngles")}
            personaHighlight="creator"
            sparseNote={
              creatorSparse
                ? "Only high-confidence narrative angles are shown."
                : undefined
            }
          />

          <HeatSection
            title="Investor Watchlist"
            description="Neutral watch context for builders and investors."
            items={dashboard.investorWatchlist}
            sectionDataSource={sectionSource("investorWatchlist")}
            personaHighlight="investor"
            sectionDisclaimer={
              investorMetricHeavy
                ? "Watchlist items are signals, not recommendations."
                : undefined
            }
          />

          <footer className="mt-16 border-t border-border py-8 text-center text-[12px] text-text-muted">
            {footerLabel} · <code className="text-accent">not investment advice</code>
          </footer>
        </main>
      ) : null}
    </div>
  );
}
