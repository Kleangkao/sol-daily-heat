"use client";

import { EXPLORE_BAR_CHIPS, type ExploreChipId } from "@/lib/heat/explore-navigation";
import { DailyHeatTitle } from "@/components/heat/EmojiAccents";

type Props = {
  activeChip: ExploreChipId;
  onChipClick: (id: ExploreChipId) => void;
};

export default function ExploreBar({ activeChip, onChipClick }: Props) {
  return (
    <div className="explore-bar-shell -mx-4 border-b border-border/70 px-4 sm:-mx-6 sm:px-6 lg:sticky lg:top-0 lg:z-30 lg:mx-0 lg:border-b lg:bg-bg-primary/95 lg:px-0 lg:pb-2 lg:pt-[max(0.25rem,env(safe-area-inset-top,0px))] lg:backdrop-blur-md">
      <nav
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] scrollbar-hidden"
        aria-label="Explore dashboard"
      >
        {EXPLORE_BAR_CHIPS.map((chip) => {
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
              {chip.id === "top-heat" ? <DailyHeatTitle /> : chip.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
