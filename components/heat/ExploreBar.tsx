"use client";

import { EXPLORE_CHIPS, type ExploreChipId } from "@/lib/heat/explore-navigation";

type Props = {
  activeChip: ExploreChipId;
  onChipClick: (id: ExploreChipId) => void;
};

export default function ExploreBar({ activeChip, onChipClick }: Props) {
  return (
    <div className="sticky top-0 z-30 -mx-1 border-b border-border/70 bg-bg-primary/95 pt-[max(0.25rem,env(safe-area-inset-top,0px))] pb-2 backdrop-blur-md">
      <nav
        className="flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-0.5 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
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
              className={`min-h-[44px] shrink-0 snap-start rounded-full border px-3.5 py-2.5 text-[13px] font-medium transition-colors sm:px-3 sm:py-2 sm:text-[12px] ${
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
