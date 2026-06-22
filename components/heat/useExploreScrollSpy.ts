"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  EXPLORE_SCROLL_SECTION_IDS,
  exploreChipForSectionElementId,
  type ExploreChipId,
} from "@/lib/heat/explore-navigation";
import type { TopicCategory } from "@/lib/types/db";

const MOBILE_MQL = "(max-width: 1023px)";
export const EXPLORE_SCROLL_SPY_PAUSE_MS = 1000;

function measureStickyTopOffset(): number {
  const mobileDock = document.querySelector<HTMLElement>(".mobile-topic-dock");
  if (mobileDock && window.matchMedia(MOBILE_MQL).matches) {
    return Math.ceil(mobileDock.getBoundingClientRect().height);
  }

  return 72;
}

function isMobileViewport(): boolean {
  return window.matchMedia(MOBILE_MQL).matches;
}

function pickActiveSectionId(
  visible: IntersectionObserverEntry[],
  activationLine: number
): string | null {
  for (const entry of visible) {
    const { top, bottom } = entry.boundingClientRect;
    if (top <= activationLine && bottom > activationLine) {
      return entry.target.id;
    }
  }

  let bestId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const entry of visible) {
    const top = entry.boundingClientRect.top;
    const distance = Math.abs(top - activationLine);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = entry.target.id;
    }
  }

  return bestId;
}

function fallbackSectionId(): string | null {
  let bestId: string | null = null;
  let bestTop = Number.NEGATIVE_INFINITY;

  for (const id of EXPLORE_SCROLL_SECTION_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const { top, bottom } = el.getBoundingClientRect();
    if (top < window.innerHeight && bottom > 0 && top > bestTop) {
      bestTop = top;
      bestId = id;
    }
  }

  return bestId;
}

export function useScrollSpyControls() {
  const pauseRef = useRef(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const pauseScrollSpy = useCallback((ms = EXPLORE_SCROLL_SPY_PAUSE_MS) => {
    pauseRef.current = true;
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      pauseRef.current = false;
    }, ms);
  }, []);

  useEffect(
    () => () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    },
    []
  );

  return { pauseRef, pauseScrollSpy };
}

type ScrollSpyOptions = {
  enabled: boolean;
  categoryFilter: TopicCategory | null;
  setActiveExploreChip: (chip: ExploreChipId) => void;
  pauseRef: React.MutableRefObject<boolean>;
};

export function useExploreScrollSpy({
  enabled,
  categoryFilter,
  setActiveExploreChip,
  pauseRef,
}: ScrollSpyOptions) {
  const categoryRef = useRef(categoryFilter);
  categoryRef.current = categoryFilter;

  const setActiveRef = useRef(setActiveExploreChip);
  setActiveRef.current = setActiveExploreChip;

  useEffect(() => {
    if (!enabled) return;

    let observer: IntersectionObserver | null = null;
    const visibleEntries = new Map<string, IntersectionObserverEntry>();

    const applyActiveSection = () => {
      if (pauseRef.current || !isMobileViewport()) return;

      const topOffset = measureStickyTopOffset();
      const activationLine = topOffset + 4;

      const visible = Array.from(visibleEntries.values());
      const bestId =
        visible.length > 0
          ? pickActiveSectionId(visible, activationLine)
          : fallbackSectionId();

      if (!bestId) return;

      const chip = exploreChipForSectionElementId(bestId, categoryRef.current);
      if (!chip) return;

      setActiveRef.current((prev) => (prev === chip ? prev : chip));
    };

    const connectObserver = () => {
      observer?.disconnect();
      visibleEntries.clear();

      if (!isMobileViewport()) return;

      const topOffset = measureStickyTopOffset();

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              visibleEntries.set(entry.target.id, entry);
            } else {
              visibleEntries.delete(entry.target.id);
            }
          }
          applyActiveSection();
        },
        {
          root: null,
          rootMargin: `-${topOffset}px 0px -55% 0px`,
          threshold: [0, 0.05, 0.15, 0.35, 0.55, 0.75],
        }
      );

      for (const id of EXPLORE_SCROLL_SECTION_IDS) {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      }
    };

    connectObserver();

    const dock = document.querySelector<HTMLElement>(".mobile-topic-dock");
    const resizeObserver =
      dock && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => connectObserver())
        : null;
    resizeObserver?.observe(dock!);

    const onViewportChange = () => connectObserver();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);

    return () => {
      observer?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
    };
  }, [enabled, pauseRef]);
}
