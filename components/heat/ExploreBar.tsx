"use client";

import { useEffect, useRef } from "react";
import { EXPLORE_BAR_CHIPS, type ExploreChipId } from "@/lib/heat/explore-navigation";
import { DailyHeatTitle } from "@/components/heat/EmojiAccents";

const CHIP_ROW_USER_SCROLL_PAUSE_MS = 1500;

type Props = {
  activeChip: ExploreChipId;
  onChipClick: (id: ExploreChipId) => void;
};

export default function ExploreBar({ activeChip, onChipClick }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const chipUserScrollRef = useRef(false);
  const chipUserScrollTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const programmaticChipScrollRef = useRef(false);
  const prevActiveChipRef = useRef(activeChip);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const onNavScroll = () => {
      if (programmaticChipScrollRef.current) return;
      chipUserScrollRef.current = true;
      if (chipUserScrollTimerRef.current) clearTimeout(chipUserScrollTimerRef.current);
      chipUserScrollTimerRef.current = setTimeout(() => {
        chipUserScrollRef.current = false;
      }, CHIP_ROW_USER_SCROLL_PAUSE_MS);
    };

    nav.addEventListener("scroll", onNavScroll, { passive: true });
    return () => {
      nav.removeEventListener("scroll", onNavScroll);
      if (chipUserScrollTimerRef.current) clearTimeout(chipUserScrollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const chipChanged = prevActiveChipRef.current !== activeChip;
    prevActiveChipRef.current = activeChip;
    if (!chipChanged) return;

    if (chipUserScrollRef.current) {
      chipUserScrollRef.current = false;
      if (chipUserScrollTimerRef.current) clearTimeout(chipUserScrollTimerRef.current);
    }

    const nav = navRef.current;
    const chip = nav?.querySelector<HTMLElement>(`[data-explore-chip="${activeChip}"]`);
    if (!nav || !chip) return;

    programmaticChipScrollRef.current = true;
    chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });

    const timer = setTimeout(() => {
      programmaticChipScrollRef.current = false;
    }, 500);

    return () => clearTimeout(timer);
  }, [activeChip]);

  return (
    <div className="explore-bar-shell -mx-4 border-b border-border/70 px-4 sm:-mx-6 sm:px-6 lg:sticky lg:top-0 lg:z-30 lg:mx-0 lg:border-b lg:bg-bg-primary/95 lg:px-0 lg:pb-2 lg:pt-[max(0.25rem,env(safe-area-inset-top,0px))] lg:backdrop-blur-md">
      <nav
        ref={navRef}
        className="flex gap-2 overflow-x-auto overscroll-x-contain snap-x snap-mandatory [-webkit-overflow-scrolling:touch] scrollbar-hidden max-lg:pb-0 lg:pb-0.5"
        aria-label="Explore dashboard"
      >
        {EXPLORE_BAR_CHIPS.map((chip) => {
          const active = activeChip === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              data-explore-chip={chip.id}
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
