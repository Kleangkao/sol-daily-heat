import type { RankingSection } from "@/lib/types/db";
import type { HeatDashboardData } from "@/lib/types/heat";

export type DashboardSectionKey = keyof Pick<
  HeatDashboardData,
  | "topHeat"
  | "newTokens"
  | "defiSignals"
  | "creatorAngles"
  | "investorWatchlist"
  | "builderWatch"
>;

export const DASHBOARD_SECTIONS: Array<{
  dataKey: DashboardSectionKey;
  rankingSection: RankingSection;
}> = [
  { dataKey: "topHeat", rankingSection: "top_heat" },
  { dataKey: "newTokens", rankingSection: "new_tokens" },
  { dataKey: "defiSignals", rankingSection: "defi_signals" },
  { dataKey: "builderWatch", rankingSection: "builder_watch" },
  { dataKey: "creatorAngles", rankingSection: "creator_angles" },
  { dataKey: "investorWatchlist", rankingSection: "investor_watchlist" },
];
