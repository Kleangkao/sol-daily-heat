import type { HeatCardView, HeatDashboardData } from "@/lib/types/heat";
import {
  CREATOR_SPACE,
  HOT_ON_SOLANA,
  NEW_AND_TRENDING,
} from "@/lib/product/copy";

const SECTIONS: { label: string; items: (d: HeatDashboardData) => HeatCardView[] }[] = [
  { label: HOT_ON_SOLANA.shortLabel, items: (d) => d.topHeat },
  { label: NEW_AND_TRENDING.shortLabel, items: (d) => d.newTokens },
  { label: "DeFi", items: (d) => d.defiSignals },
  { label: "Builder", items: (d) => d.builderWatch },
  { label: CREATOR_SPACE.shortLabel, items: (d) => d.creatorAngles },
  { label: "Investor", items: (d) => d.investorWatchlist },
];

/** Topic id → section labels where the topic appears (client-side, no API). */
export function buildTopicSectionLabels(
  dashboard: HeatDashboardData
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const { label, items } of SECTIONS) {
    for (const card of items(dashboard)) {
      const existing = map.get(card.id) ?? [];
      if (!existing.includes(label)) {
        map.set(card.id, [...existing, label]);
      }
    }
  }
  return map;
}

export function alsoInSections(
  topicSections: Map<string, string[]>,
  topicId: string,
  currentSection: string
): string[] {
  const all = topicSections.get(topicId) ?? [];
  return all.filter((s) => s !== currentSection);
}
