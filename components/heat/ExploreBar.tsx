"use client";

import {
  EXPLORE_CHIPS,
  isExploreChipActive,
  type ExploreChipId,
} from "@/lib/heat/explore-navigation";
import type { TopicCategory } from "@/lib/types/db";

type Props = {
  categoryFilter: TopicCategory | null;
  onChipClick: (id: ExploreChipId) => void;
};

export default function ExploreBar({ categoryFilter, onChipClick }: Props) {
  return (
    <nav
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]"
      aria-label="Explore dashboard"
    >
      {EXPLORE_CHIPS.map((chip) => {
        const active = isExploreChipActive(chip.id, categoryFilter);
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChipClick(chip.id)}
            aria-pressed={active}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              active
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-bg-secondary text-text-secondary hover:border-accent/50 hover:text-accent"
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </nav>
  );
}
