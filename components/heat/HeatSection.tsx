import type { ReactNode } from "react";
import HeatCard from "./HeatCard";
import { alsoInSections } from "@/lib/heat/topic-section-appearances";
import type {
  HeatCardPersonaHighlight,
  HeatCardView,
  SectionDataSource,
} from "@/lib/types/heat";

type Props = {
  title: string;
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

function cardCountLabel(count: number): string {
  return count === 1 ? "1 card" : `${count} cards`;
}

export default function HeatSection({
  title,
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
  const count = items.length;
  const statusLabel =
    sectionDataSource === "mock" ? "Demo" : sectionDataSource === "live" ? "Live" : null;

  const headerTitle = collapsible && !isOpen ? `${title} · ${count}` : title;

  const headerInner = (
    <>
      <div className="flex flex-1 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[22px] font-bold uppercase tracking-wide text-text-primary">
            {headerTitle}
          </h2>
          <p className="mt-1 text-[12px] text-text-muted">
            {cardCountLabel(count)}
            {statusLabel ? ` · ${statusLabel}` : ""}
          </p>
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
    <section id={sectionId} className="mt-10 scroll-mt-[4.5rem]">
      <div className="mb-4 rounded-[10px] border border-border bg-bg-card/40">
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
          {description ? (
            <p className="mb-3 max-w-2xl text-[13px] text-text-secondary">{description}</p>
          ) : null}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
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
