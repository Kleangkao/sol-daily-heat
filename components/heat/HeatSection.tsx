import HeatCard from "./HeatCard";
import type {
  HeatCardPersonaHighlight,
  HeatCardView,
  SectionDataSource,
} from "@/lib/types/heat";

type Props = {
  title: string;
  description?: string;
  items: HeatCardView[];
  emptyMessage?: string;
  /** When "mock", section title shows a demo label */
  sectionDataSource?: SectionDataSource;
  /** Shown when the section has fewer cards than its cap (curated sparse) */
  sparseNote?: string;
  /** Neutral disclaimer below the section header */
  sectionDisclaimer?: string;
  /** Surfaces persona-specific copy on cards in Creator / Investor sections */
  personaHighlight?: HeatCardPersonaHighlight;
};

export default function HeatSection({
  title,
  description,
  items,
  emptyMessage = "No signals for this filter today.",
  sectionDataSource,
  sparseNote,
  sectionDisclaimer,
  personaHighlight,
}: Props) {
  return (
    <section className="mt-10">
      <div className="mb-4">
        <h2 className="font-heading text-[22px] font-bold uppercase tracking-wide text-text-primary">
          {title}
          {sectionDataSource === "mock" ? (
            <span className="ml-2 text-[12px] font-normal normal-case text-text-muted">
              (demo)
            </span>
          ) : null}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-[13px] text-text-secondary">{description}</p>
        ) : null}
        {sectionDisclaimer ? (
          <p className="mt-1 max-w-2xl text-[12px] italic text-text-muted">
            {sectionDisclaimer}
          </p>
        ) : null}
        {sparseNote && items.length > 0 ? (
          <p className="mt-1 max-w-2xl text-[12px] text-text-muted">{sparseNote}</p>
        ) : null}
      </div>
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
            />
          ))}
        </div>
      )}
    </section>
  );
}
