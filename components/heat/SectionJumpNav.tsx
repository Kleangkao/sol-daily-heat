import type { DashboardSectionDomId } from "@/lib/heat/section-collapse";

const SECTION_LINKS: { id: DashboardSectionDomId; label: string }[] = [
  { id: "top-heat", label: "Top Heat" },
  { id: "new-tokens", label: "New Tokens" },
  { id: "defi", label: "DeFi Signals" },
  { id: "builder", label: "Builder" },
  { id: "creator", label: "Creator" },
  { id: "investor", label: "Investor" },
];

type Props = {
  onNavigate: (id: DashboardSectionDomId) => void;
};

export default function SectionJumpNav({ onNavigate }: Props) {
  return (
    <nav
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
      aria-label="Jump to dashboard section"
    >
      {SECTION_LINKS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onNavigate(s.id)}
          className="shrink-0 rounded-full border border-border bg-bg-secondary px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:border-accent/50 hover:text-accent"
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
