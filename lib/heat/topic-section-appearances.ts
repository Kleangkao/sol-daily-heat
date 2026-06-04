import type { HeatCardView, HeatDashboardData } from "@/lib/types/heat";

const SECTIONS: { label: string; items: (d: HeatDashboardData) => HeatCardView[] }[] = [
  { label: "Top Heat", items: (d) => d.topHeat },
  { label: "New Tokens", items: (d) => d.newTokens },
  { label: "DeFi", items: (d) => d.defiSignals },
  { label: "Builder", items: (d) => d.builderWatch },
  { label: "Creator", items: (d) => d.creatorAngles },
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
