import type { PulseTokenLabel } from "@/lib/market-pulse/types";
import type { RankingSection, TopicCategory } from "@/lib/types/db";

export type TokenMarketSnapshot = {
  priceUsd: number | null;
  change24hPct: number | null;
  liquidityUsd: number | null;
  volumeH24: number | null;
  fetchedAt: string;
  source: "watchlist" | "hot_tape";
};

export type TokenRelatedTopic = {
  id: string;
  title: string;
  category: TopicCategory;
  heatScore: number;
  rankingDate: string;
  sections: Array<{
    section: RankingSection;
    sectionLabel: string;
    rankPosition: number | null;
    heatScore: number;
  }>;
};

export type TokenTimelineEntry = {
  id: string;
  sourceName: string;
  sourceSlug: string;
  title: string;
  url: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  itemType: string;
  signal: string | null;
  signalLabels: string[];
};

export type TokenDetailProtocol = {
  name: string;
  slug: string;
  category: string | null;
  websiteUrl: string | null;
};

export type TokenDetailView = {
  mint: string;
  symbol: string;
  name: string | null;
  tokenId: string | null;
  firstSeenAt: string | null;
  badges: PulseTokenLabel[];
  marketSnapshot: TokenMarketSnapshot | null;
  pulseRoles: Array<"anchor" | "hot_tokens" | "hot_tape">;
  scannerContext: string[];
  relatedTopics: TokenRelatedTopic[];
  timeline: TokenTimelineEntry[];
  protocols: TokenDetailProtocol[];
  riskNotes: string[];
  dexScreenerUrl: string | null;
  uniqueSourceCount: number;
};
