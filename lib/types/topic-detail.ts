import type {
  InterpretationType,
  RankingSection,
  ScoreBreakdown,
  TopicCategory,
} from "@/lib/types/db";
import type { TopicEvidence } from "@/lib/types/evidence";

export type SectionAppearance = {
  section: RankingSection;
  sectionLabel: string;
  heatScore: number;
  rankPosition: number | null;
  rankingDate: string;
};

export type TopicDetailToken = {
  symbol: string;
  name: string | null;
  mintAddress: string | null;
  explorerUrl: string | null;
};

export type TopicDetailProtocol = {
  name: string;
  slug: string;
  category: string | null;
  websiteUrl: string | null;
};

export type TopicTimelineEntry = {
  id: string;
  sourceName: string;
  sourceSlug: string;
  title: string;
  url: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  itemType: string;
  signal: string | null;
  headlineOnly: boolean;
  isPrimary: boolean;
};

export type TopicDetailView = {
  id: string;
  title: string;
  summary: string;
  category: TopicCategory;
  whyHot: string;
  riskNote: string;
  interpretationType: InterpretationType;
  confidence: number;
  firstSeenAt: string;
  lastUpdatedAt: string;
  heatScore: number;
  scoreBreakdown: ScoreBreakdown;
  evidence: TopicEvidence | null;
  creatorAngle: string | null;
  investorWatchline: string | null;
  builderNote: string | null;
  sectionAppearancesToday: SectionAppearance[];
  rankingHistory: Array<{
    rankingDate: string;
    section: RankingSection;
    heatScore: number;
    rankPosition: number | null;
  }>;
  tokens: TopicDetailToken[];
  protocols: TopicDetailProtocol[];
  timeline: TopicTimelineEntry[];
  headlineOnlySources: boolean;
  rankingDate: string;
  /** Distinct linked sources (topic_sources), used for score explanation copy */
  uniqueSourceCount: number;
};
