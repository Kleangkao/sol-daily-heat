"use client";

type Props = {
  breakdown?: Record<string, number>;
  score: number;
};

const LABELS: Record<string, string> = {
  source_diversity: "Sources",
  recency: "Recency",
  volume_signal: "Market",
  keyword_match: "Solana fit",
  reliability_weight: "Reliability",
  novelty: "Novelty",
  tvl_delta: "TVL move",
  boost_only_cap: "Boost-only cap",
  boost_top_heat_penalty: "Top Heat boost penalty",
  official_source_bonus: "Official source",
  editorial_confirmation: "Multi-editorial",
  cross_type_corroboration: "Cross-type match",
  fee_threshold_passed: "Fees threshold",
  fee_small_base_discount: "Small-base fees discount",
};

export default function ScoreBreakdown({ breakdown, score }: Props) {
  if (!breakdown || Object.keys(breakdown).length === 0) return null;

  return (
    <details className="mt-2 group">
      <summary className="cursor-pointer text-[11px] font-semibold text-accent hover:text-accent-hover">
        Heat {score} — why this score
      </summary>
      <ul className="mt-2 space-y-1 rounded-[8px] border border-border/60 bg-bg-secondary/40 px-3 py-2">
        {Object.entries(breakdown).map(([key, val]) => {
          const n = Number(val);
          if (!Number.isFinite(n) || n === 0) return null;
          const sign = n > 0 ? "+" : "";
          return (
            <li key={key} className="flex justify-between text-[11px] text-text-secondary">
              <span>{LABELS[key] ?? key}</span>
              <span className="font-mono text-text-primary">
                {sign}
                {n}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
