import type {
  HeatDashboardData,
  DashboardDataSource,
  SectionDataSource,
  DashboardSectionKey,
} from "@/lib/types/heat";
import { DASHBOARD_SECTIONS } from "./dashboard-sections";

/**
 * Per-section fallback: use live rows when present, otherwise mock for that section only.
 * dataSource is "live" | "mock" | "mixed" depending on section mix.
 */
export function mergeDashboard(
  live: HeatDashboardData | null,
  mock: HeatDashboardData
): HeatDashboardData {
  const sectionSources: Partial<Record<DashboardSectionKey, SectionDataSource>> = {};

  const merged: HeatDashboardData = {
    ...mock,
    date: live?.date ?? mock.date,
    availableDates: live?.availableDates ?? mock.availableDates,
    topHeat: mock.topHeat,
    newTokens: mock.newTokens,
    defiSignals: mock.defiSignals,
    builderWatch: mock.builderWatch,
    creatorAngles: mock.creatorAngles,
    investorWatchlist: mock.investorWatchlist,
  };

  let liveCount = 0;

  for (const { dataKey } of DASHBOARD_SECTIONS) {
    const liveItems = live?.[dataKey] ?? [];

    if (liveItems.length > 0) {
      merged[dataKey] = liveItems;
      sectionSources[dataKey] = "live";
      liveCount += 1;
    } else {
      merged[dataKey] = mock[dataKey];
      sectionSources[dataKey] = "mock";
    }
  }

  const total = DASHBOARD_SECTIONS.length;
  let dataSource: DashboardDataSource;
  if (liveCount === total) dataSource = "live";
  else if (liveCount === 0) dataSource = "mock";
  else dataSource = "mixed";

  merged.dataSource = dataSource;
  merged.sectionSources = sectionSources;

  return merged;
}
