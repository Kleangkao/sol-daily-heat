import type { InterpretationType } from "@/lib/types/db";

const LABELS: Record<InterpretationType, string> = {
  raw: "Raw signal",
  rule_based: "Rule-based",
  ai: "AI summary",
};

export default function SignalTypeBadge({ type }: { type: InterpretationType }) {
  return (
    <span className="rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-muted">
      {LABELS[type]}
    </span>
  );
}
