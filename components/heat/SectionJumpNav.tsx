const SECTION_LINKS = [
  { id: "top-heat", label: "Top Heat" },
  { id: "new-tokens", label: "New Tokens" },
  { id: "defi", label: "DeFi" },
  { id: "builder", label: "Builder" },
  { id: "creator", label: "Creator" },
  { id: "investor", label: "Investor" },
] as const;

export default function SectionJumpNav() {
  return (
    <nav
      className="mb-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      aria-label="Jump to dashboard section"
    >
      {SECTION_LINKS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className="shrink-0 rounded-full border border-border bg-bg-secondary px-3 py-1 text-[12px] font-medium text-text-secondary transition-colors hover:border-accent/50 hover:text-accent"
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}
