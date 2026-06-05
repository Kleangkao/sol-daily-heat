import {
  HEAT_BUCKET_LABEL,
  HEAT_SCORE_HELPER,
  heatScoreBucket,
} from "@/lib/heat/heat-score-context";

type Props = {
  score: number;
  size?: "sm" | "md";
  /** Show bucket label (e.g. "High") next to score — homepage cards */
  showBucket?: boolean;
};

export default function HeatScoreBadge({ score, size = "md", showBucket = false }: Props) {
  const bucket = heatScoreBucket(score);
  const tier =
    score >= 85 ? "text-heat" : score >= 70 ? "text-accent" : "text-text-secondary";
  const text = size === "sm" ? "text-[11px]" : "text-[13px]";
  const pad = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-bg-secondary font-semibold ${pad} ${text} ${tier}`}
      title={showBucket ? HEAT_SCORE_HELPER : "Rule-based heat score (v1)"}
    >
      <span aria-hidden>🔥</span>
      {score}
      {showBucket ? (
        <>
          <span className="text-text-muted" aria-hidden>
            ·
          </span>
          <span className="text-[10px] font-medium text-text-secondary">
            {HEAT_BUCKET_LABEL[bucket]}
          </span>
        </>
      ) : null}
    </span>
  );
}
