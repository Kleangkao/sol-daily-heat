"use client";

import type { ReactNode } from "react";
import HeatCard from "./HeatCard";
import type {
  HeatCardPersonaHighlight,
  HeatCardView,
  SectionDataSource,
} from "@/lib/types/heat";
import { alsoInSections } from "@/lib/heat/topic-section-appearances";

type Props = {
  title: string;
  subtitle?: string;
  sectionId: string;
  description?: string;
  items: HeatCardView[];
  emptyMessage?: string;
  sectionDataSource?: SectionDataSource;
  sectionLabel?: string;
  topicSections?: Map<string, string[]>;
  sparseNote?: string;
  sectionDisclaimer?: string;
  personaHighlight?: HeatCardPersonaHighlight;
  isOpen?: boolean;
  onToggle?: () => void;
  toolbar?: ReactNode;
};

export default function HeatSection({
  title,
  subtitle,
  sectionId,
  description,
  items,
  emptyMessage = "No signals for this filter today.",
  sectionDataSource,
  sectionLabel,
  topicSections,
  sparseNote,
  sectionDisclaimer,
  personaHighlight,
  isOpen = true,
  onToggle,
  toolbar,
}: Props) {
  const panelId = `${sectionId}-panel`;
  const collapsible = Boolean(onToggle);
  const statusLabel =
    sectionDataSource === "mock" ? "demo" : sectionDataSource === "live" ? "live" : null;

  const headerTitle = title;

  const headerInner = (
    <>
      <div className="flex flex-1 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary sm:text-[22px]">
            {headerTitle}
          </h2>
          {subtitle && isOpen ? (
            <p className="mt-0.5 text-[12px] font-medium tracking-wide text-accent sm:text-[13px]">
              {subtitle}
            </p>
          ) : null}
          {statusLabel ? (
            <p className="mt-1 text-[12px] lowercase text-text-muted">{statusLabel}</p>
          ) : null}
        </div>
        {collapsible ? (
          <span
            className="mt-1 shrink-0 text-[18px] leading-none text-text-muted"
            aria-hidden="true"
          >
            {isOpen ? "−" : "+"}
          </span>
        ) : null}
      </div>
    </>
  );

  return (
    <section id={sectionId} className="mt-8 scroll-mt-[6.5rem] sm:mt-10 sm:scroll-mt-[5rem]">
      <div className="mb-4 rounded-[12px] border border-border bg-bg-card/40">
        {collapsible ? (
          <button
            type="button"
            className="flex w-full min-h-[48px] items-start gap-2 px-4 py-3 text-left transition-colors hover:bg-bg-secondary/50 sm:px-5"
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={onToggle}
          >
            {headerInner}
          </button>
        ) : (
          <div className="px-4 py-3 sm:px-5">{headerInner}</div>
        )}
      </div>

      {isOpen ? (
        <div id={panelId}>
          {toolbar ? <div className="mb-4">{toolbar}</div> : null}
          {sectionDisclaimer ? (
            <p className="mb-3 max-w-2xl text-[12px] italic text-text-muted">
              {sectionDisclaimer}
            </p>
          ) : null}
          {sparseNote && items.length > 0 ? (
            <p className="mb-3 max-w-2xl text-[12px] text-text-muted">{sparseNote}</p>
          ) : null}

          {items.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-border px-4 py-8 text-center text-[13px] text-text-secondary">
              {emptyMessage}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <HeatCard
                  key={item.id}
                  item={item}
                  detailEnabled={sectionDataSource === "live"}
                  personaHighlight={personaHighlight}
                  alsoIn={
                    sectionLabel && topicSections
                      ? alsoInSections(topicSections, item.id, sectionLabel)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
