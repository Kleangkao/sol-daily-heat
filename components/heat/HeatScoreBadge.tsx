type Props = {
  score: number;
  size?: "sm" | "md";
};

export default function HeatScoreBadge({ score, size = "md" }: Props) {
  const tier =
    score >= 85 ? "text-heat" : score >= 70 ? "text-accent" : "text-text-secondary";
  const text = size === "sm" ? "text-[11px]" : "text-[13px]";
  const pad = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-bg-secondary font-semibold ${pad} ${text} ${tier}`}
      title="Rule-based heat score (v1)"
    >
      <span aria-hidden>🔥</span>
      {score}
    </span>
  );
}
