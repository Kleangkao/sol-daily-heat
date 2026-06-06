"use client";

import { EXPLORE_CHIPS, type ExploreChipId } from "@/lib/heat/explore-navigation";

type Props = {
  activeChip: ExploreChipId;
  onChipClick: (id: ExploreChipId) => void;
};

export default function ExploreBar({ activeChip, onChipClick }: Props) {
  return (
    <div className="sticky top-0 z-30 -mx-1 border-b border-border bg-bg-primary/95 py-2 backdrop-blur-sm">
      <nav
        className="flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]"
        aria-label="Explore dashboard"
      >
      {EXPLORE_CHIPS.map((chip) => {
        const active = activeChip === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChipClick(chip.id)}
            aria-pressed={active}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              active
                ? "border-heat/50 bg-heat/10 text-heat"
                : "border-border bg-bg-secondary text-text-secondary hover:border-accent/40 hover:text-accent"
            }`}
          >
            {chip.label}
          </button>
        );
      })}
      </nav>
    </div>
  );
}
