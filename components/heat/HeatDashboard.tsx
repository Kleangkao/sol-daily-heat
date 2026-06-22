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
  DEMO_TOPIC_SECTION_IDS,
  EXPLORE_SCROLL_SECTION_IDS,
  exploreChipForSectionElementId,
  resolveExploreChipAction,
  type ExploreChipId,
} from "@/lib/heat/explore-navigation";
import { parseSectionHash } from "@/lib/heat/section-collapse";
import { buildTopicSectionLabels } from "@/lib/heat/topic-section-appearances";
import { utcAvailableDates, utcTodayIso } from "@/lib/heat/snapshot-date";
import type { HeatDashboardData, DashboardSectionKey } from "@/lib/types/heat";
import type { TopicCategory } from "@/lib/types/db";
import { CATEGORY_LABELS } from "@/lib/types/heat";
import {
  HOT_ON_SOLANA,
  NEW_AND_TRENDING,
} from "@/lib/product/copy";
import { sectionItemsMetricHeavy } from "@/lib/heat/card-display";
import DashboardMainSkeleton from "./DashboardMainSkeleton";
import DemoPreviewBanner from "./DemoPreviewBanner";
import ExploreBar from "./ExploreBar";
import HeatHero from "./HeatHero";
import HeatSection from "./HeatSection";
import { DailyHeatTitle } from "./EmojiAccents";
import MarketPulse from "./MarketPulse";
import PastSnapshotsNav from "./PastSnapshotsNav";
import SolanaSocial from "./SolanaSocial";
import DemoSpotlightSection from "./DemoSpotlightSection";
import { HOMEPAGE_DEMO_SECTIONS } from "@/lib/demo/spotlight-sections";
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
    deriveActiveExploreChip(initialCategoryFilter, null, typeof window !== "undefined" ? window.location.hash : "")
  );
  const { open: sectionOpen, toggleSection, navigateToSection, navigateToSections } =
    useSectionOpenState();

  useEffect(() => {
    const locationHash = window.location.hash;
    const hash = parseSectionHash(locationHash);
    setActiveExploreChip(deriveActiveExploreChip(categoryFilter, hash, locationHash));
  }, [categoryFilter]);

  useEffect(() => {
    const onHashChange = () => {
      const locationHash = window.location.hash;
      const hash = parseSectionHash(locationHash);
      setActiveExploreChip(deriveActiveExploreChip(categoryFilter, hash, locationHash));
      const demoId = locationHash.replace(/^#/, "");
      if ((Object.values(DEMO_TOPIC_SECTION_IDS) as string[]).includes(demoId)) {
        requestAnimationFrame(() => {
          document.getElementById(demoId)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
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

  useEffect(() => {
    if (!dashboard) return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }

        if (visible.size === 0) return;

        const bestId = Array.from(visible.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (!bestId) return;

        const chip = exploreChipForSectionElementId(bestId, categoryFilter);
        if (chip) setActiveExploreChip(chip);
      },
      {
        root: null,
        rootMargin: "-30% 0px -45% 0px",
        threshold: [0, 0.15, 0.35, 0.55],
      }
    );

    for (const id of EXPLORE_SCROLL_SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [dashboard, categoryFilter]);

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
        case "demo-section":
          setCategoryFilter(null);
          syncUrl(date, null);
          window.history.replaceState(null, "", `#${action.sectionId}`);
          requestAnimationFrame(() => {
            document.getElementById(action.sectionId)?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          });
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
    if (categoryFilter === null) return `No ${HOT_ON_SOLANA.title} topics for this snapshot.`;
    const snapshot = dashboard.date;
    const curatedNote = " Other sections below are curated separately.";
    const label = CATEGORY_LABELS[categoryFilter];
    return `No ${HOT_ON_SOLANA.title} topics matched ${label} for snapshot ${snapshot} UTC.${curatedNote}`;
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

  const investorMetricHeavy =
    dashboard != null && sectionItemsMetricHeavy(dashboard.investorWatchlist);

  const footerLabel =
    dashboard?.dataSource === "live"
      ? "Live rankings from Supabase"
      : dashboard?.dataSource === "mixed"
        ? "Mixed: live Supabase data where available; sections marked (demo) use mock data"
        : dashboard
          ? "Demo mock data"
          : "";

  const exploreChipProps = {
    activeChip: activeExploreChip,
    onChipClick: onExploreChip,
  };

  const mobileTopicDock = (
    <div className="mobile-topic-dock mx-auto max-w-7xl px-4 sm:px-6 lg:hidden">
      <ExploreBar key="mobile-explore" {...exploreChipProps} />
    </div>
  );

  return (
    <div className="min-h-screen">
      <HeatHero archiveDate={archiveDate} />
      {dashboard && dashboard.dataSource && dashboard.dataSource !== "live" ? (
        <DemoPreviewBanner
          dataSource={dashboard.dataSource}
          snapshotDate={dashboard.date}
        />
      ) : null}
      <div className="mobile-page-shell">
        {mobileTopicDock}
        {awaitingData ? (
          <main className="mx-auto max-w-7xl px-4 pt-4 pb-5 sm:px-6 sm:py-8 lg:px-8">
            <div className="hidden lg:block">
              <ExploreBar key="desktop-explore" {...exploreChipProps} />
            </div>
            <DashboardMainSkeleton />
          </main>
        ) : dashboard ? (
          <main className="mx-auto max-w-7xl px-4 pt-4 pb-5 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[252px_minmax(0,1fr)_252px]">
            <aside className="hidden lg:block">
              <div className="sticky top-4">
                <SolanaSocial headingId="solana-social-desktop-heading" />
              </div>
            </aside>

            <div className="min-w-0">
              <div className="hidden lg:block">
            <ExploreBar key="desktop-explore" {...exploreChipProps} />
          </div>

              <HeatSection
                title={<DailyHeatTitle />}
                sectionId="top-heat"
                sectionLabel={HOT_ON_SOLANA.shortLabel}
                topicSections={topicSections}
                description={HOT_ON_SOLANA.description}
                items={topFiltered}
                emptyMessage={topHeatEmptyMessage}
                sectionDataSource={sectionSource("topHeat")}
                isOpen={sectionOpen["top-heat"]}
                onToggle={() => toggleSection("top-heat")}
              />

              <div className="mb-5 flex flex-col gap-5 lg:hidden">
                <SolanaSocial headingId="solana-social-mobile-heading" feed />
                <MarketPulse
                  feed
                  headingId="market-pulse-mobile-heading"
                  heatDataSource={dashboard.dataSource}
                  newTokenMints={newTokenMints}
                />
              </div>

              <HeatSection
                title={NEW_AND_TRENDING.title}
                sectionId="new-tokens"
                sectionLabel={NEW_AND_TRENDING.shortLabel}
                topicSections={topicSections}
                description={NEW_AND_TRENDING.description}
                items={dashboard.newTokens}
                sectionDataSource={sectionSource("newTokens")}
                isOpen={sectionOpen["new-tokens"]}
                onToggle={() => toggleSection("new-tokens")}
              />

              <HeatSection
                title="DeFi & Protocols"
                sectionId="defi"
                sectionLabel="DeFi"
                topicSections={topicSections}
                description="Protocol TVL, volume, and stake-flow context from free DeFi adapters."
                items={dashboard.defiSignals}
                sectionDataSource={sectionSource("defiSignals")}
                isOpen={sectionOpen.defi}
                onToggle={() => toggleSection("defi")}
              />

              {HOMEPAGE_DEMO_SECTIONS.map((section) => (
                <DemoSpotlightSection key={section.id} section={section} />
              ))}

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
                  heatDataSource={dashboard.dataSource}
                  newTokenMints={newTokenMints}
                />
              </div>
            </aside>
          </div>
        </main>
        ) : null}
      </div>
    </div>
  );
}
