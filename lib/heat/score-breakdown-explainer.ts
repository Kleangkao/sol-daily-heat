import type { ScoreBreakdown } from "@/lib/types/db";

export type ScoreExplainRow = {
  key: string;
  label: string;
  points: number;
  explanation: string;
};

export type ScoreExplainContext = {
  uniqueSourceCount: number;
};

function explainSourceDiversity(points: number, ctx?: ScoreExplainContext): string {
  if (points <= 0) {
    return "Limited source diversity capped corroboration points.";
  }
  const count = ctx?.uniqueSourceCount;
  if (count != null && count <= 1) {
    return "Single source/signal contributed; no independent corroboration yet.";
  }
  if (count != null && count >= 2) {
    return "Multiple independent sources corroborated the story or signal.";
  }
  return "Source/signal count contributed to this topic's score.";
}

const ROWS: Array<{
  key: string;
  label: string;
  explain: (n: number, ctx?: ScoreExplainContext) => string;
}> = [
  {
    key: "recency",
    label: "Freshness",
    explain: (n) =>
      n > 0
        ? "Recent signals within the scanner freshness window boosted this topic."
        : "Older signals reduced the freshness contribution.",
  },
  {
    key: "reliability_weight",
    label: "Source authority",
    explain: (n) =>
      n > 0
        ? "Higher-trust sources (official blogs, established feeds) added weight."
        : "Lower-trust or thin sources limited authority weight.",
  },
  {
    key: "source_diversity",
    label: "Source count",
    explain: (n, ctx) => explainSourceDiversity(n, ctx),
  },
  {
    key: "volume_signal",
    label: "Market / protocol movement",
    explain: (n) =>
      n > 0
        ? "Notable market or on-chain protocol activity contributed to heat."
        : "Little measurable market/protocol movement in the window.",
  },
  {
    key: "keyword_match",
    label: "Solana relevance",
    explain: (n) =>
      n > 0
        ? "Title and cluster text matched Solana ecosystem keywords."
        : "Weak Solana keyword relevance in the cluster text.",
  },
  {
    key: "novelty",
    label: "Novelty",
    explain: (n) =>
      n > 0
        ? "Topic was new compared to yesterday’s top heat carryover set."
        : "Carryover or repeat narrative reduced novelty points.",
  },
  {
    key: "official_source_bonus",
    label: "Official project source",
    explain: (n) =>
      n > 0
        ? "A fresh official project blog or status source was in the cluster."
        : "No fresh official-source bonus applied.",
  },
  {
    key: "editorial_confirmation",
    label: "Multi-editorial confirmation",
    explain: (n) =>
      n > 0
        ? "Multiple editorial RSS sources confirmed the narrative."
        : "Headline-only or single-source editorial limited confirmation bonus.",
  },
  {
    key: "cross_type_corroboration",
    label: "Cross-type corroboration",
    explain: (n) =>
      n > 0
        ? "News/editorial signals aligned with market or protocol metrics."
        : "No cross-type corroboration between editorial and metrics.",
  },
  {
    key: "boost_only_cap",
    label: "Boost-only cap",
    explain: () => "Paid DexScreener boost-only clusters are capped in section placement.",
  },
  {
    key: "boost_top_heat_penalty",
    label: "Top Heat boost penalty",
    explain: (n) =>
      n < 0
        ? "Promoted boost signal applied a placement penalty in Top Heat sorting."
        : "No Top Heat boost penalty on this snapshot.",
  },
  {
    key: "fee_threshold_passed",
    label: "Fees threshold",
    explain: (n) =>
      n > 0
        ? "Solana fee move met the configured threshold for investor-grade metrics."
        : "Fee move did not meet the threshold.",
  },
  {
    key: "fee_small_base_discount",
    label: "Small-base fees discount",
    explain: (n) =>
      n < 0
        ? "Small absolute fee base reduced heat. Noisy percentage spike discounted."
        : "No small-base fee discount applied.",
  },
  {
    key: "tvl_delta",
    label: "TVL movement",
    explain: (n) =>
      n > 0
        ? "Protocol TVL change contributed to the score."
        : "TVL movement did not add points on this snapshot.",
  },
];

export function explainScoreBreakdown(
  breakdown: ScoreBreakdown | undefined,
  context?: ScoreExplainContext
): ScoreExplainRow[] {
  if (!breakdown) return [];

  const known = new Set(ROWS.map((r) => r.key));
  const out: ScoreExplainRow[] = [];

  for (const row of ROWS) {
    const val = breakdown[row.key];
    if (typeof val !== "number" || val === 0) continue;
    out.push({
      key: row.key,
      label: row.label,
      points: val,
      explanation: row.explain(val, context),
    });
  }

  for (const [key, val] of Object.entries(breakdown)) {
    if (known.has(key) || typeof val !== "number" || val === 0) continue;
    out.push({
      key,
      label: key.replace(/_/g, " "),
      points: val,
      explanation: "Rule-based score component from the daily scanner.",
    });
  }

  return out;
}
