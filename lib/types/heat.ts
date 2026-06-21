/** Dashboard view types — UI layer (mock / API responses) */

import type { InterpretationType, RankingSection, TopicCategory } from "./db";
import type { TopicEvidence } from "./evidence";
import type { StoryTimeKind } from "@/lib/heat/story-timestamp";
import {
  CREATOR_SPACE,
  HOT_ON_SOLANA,
  NEW_AND_TRENDING,
} from "@/lib/product/copy";

export type HeatCategoryFilter = TopicCategory | "all";

/** Homepage section card persona highlight (Creator / Investor only). */
export type HeatCardPersonaHighlight = "creator" | "investor";

export interface RelatedToken {
  symbol: string;
  name?: string;
  mintAddress?: string;
}

export interface RelatedProject {
  name: string;
  slug?: string;
  type: "protocol" | "project" | "app";
}

export interface HeatCardView {
  id: string;
  title: string;
  summary: string;
  category: TopicCategory;
  heatScore: number;
  sourceCount: number;
  firstSeen: string;
  /** Scanner refresh time (pipeline); not shown as the headline timestamp. */
  lastUpdated: string;
  /** Source-weighted story time for card display. */
  storyAt: string;
  storyTimeKind: StoryTimeKind;
  whyHot: string;
  relatedTokens: RelatedToken[];
  relatedProjects: RelatedProject[];
  riskNote: string;
  interpretationType: InterpretationType;
  scoreBreakdown?: Record<string, number>;
  confidence?: number;
  sectionLabel?: string;
  creatorAngle?: string;
  investorWatchline?: string;
  /** Set when rank_position is assigned in daily_rankings */
  rankPosition?: number | null;
  /** True when topic was hot yesterday and has new raw signals today */
  isUpdatedStory?: boolean;
  /** Grounded evidence layer (facts, links, score breakdown) */
  evidence?: TopicEvidence;
  /** Source slugs from topic_sources (live API) */
  sourceSlugs?: string[];
  /** Cluster item types from pipeline metadata */
  itemTypes?: string[];
  /** Adapter signals from ranking metadata */
  rankingSignals?: string[];
}

export type DashboardDataSource = "live" | "mock" | "mixed";

export type SectionDataSource = "live" | "mock";

export type DashboardSectionKey =
  | "topHeat"
  | "newTokens"
  | "defiSignals"
  | "creatorAngles"
  | "investorWatchlist"
  | "builderWatch";

export interface DashboardSection {
  id: RankingSection;
  title: string;
  description: string;
  items: HeatCardView[];
}

export interface HeatDashboardData {
  date: string;
  availableDates: string[];
  topHeat: HeatCardView[];
  newTokens: HeatCardView[];
  defiSignals: HeatCardView[];
  creatorAngles: HeatCardView[];
  investorWatchlist: HeatCardView[];
  builderWatch: HeatCardView[];
  dataSource?: DashboardDataSource;
  /** Per-section origin when dataSource is "mixed" */
  sectionSources?: Partial<Record<DashboardSectionKey, SectionDataSource>>;
}

export const SECTION_LABELS: Record<RankingSection, string> = {
  top_heat: HOT_ON_SOLANA.rankingSectionLabel,
  new_tokens: NEW_AND_TRENDING.rankingSectionLabel,
  defi_signals: "DeFi Signals",
  creator_angles: CREATOR_SPACE.rankingSectionLabel,
  investor_watchlist: "Investor Watchlist",
  builder_watch: "Builder / Infra Watch",
};

export const CATEGORY_LABELS: Record<TopicCategory, string> = {
  ecosystem: "Ecosystem",
  defi: "DeFi",
  meme: "Meme",
  nft: "NFT",
  infra: "Infra",
  gaming: "Gaming",
  ai: "AI",
  regulatory: "Regulatory",
  other: "Other",
};
