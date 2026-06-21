/** Public product copy for Solana Space (UI and metadata only — not DB/API identifiers). */

export const PRODUCT_NAME = "Solana Space";

export const PRODUCT_TAGLINE =
  "Daily heat, standout signals, and curated ecosystem activity — not every headline, not every launch.";

export const HOT_ON_SOLANA = {
  title: "Hot on Solana",
  shortLabel: "Hot",
  exploreLabel: "Hot on Solana",
  rankingSectionLabel: "Hot on Solana Today",
  description:
    "Highest-confidence heat scores for the UTC snapshot — important signals and standout ecosystem activity, rule-ranked and deduplicated.",
  pulseBadge: "Mentioned in Hot on Solana",
  legacyPulseBadge: "Mentioned in Top Heat",
} as const;

export const NEW_AND_TRENDING = {
  title: "New & Trending on Solana",
  shortLabel: "New & Trending",
  exploreLabel: "New & Trending",
  rankingSectionLabel: "New & Trending on Solana",
  description:
    "Newly surfaced Solana pairs and builder signals from on-chain adapters. A new token alone is not enough — placement requires traction or corroboration.",
  pulseBadge: "In New & Trending Today",
  legacyPulseBadge: "In New Tokens Today",
} as const;

export const CREATOR_SPACE = {
  title: "Creator Space",
  subtitle: "Project on Solana of the Day",
  shortLabel: "Creator Space",
  exploreLabel: "Creator Space",
  rankingSectionLabel: "Creator Space",
  description:
    "One evidence-based spotlight angle per day — an interesting project, creator, builder, or launch worth understanding, not hype.",
} as const;

/** Map legacy pulse labels from stored snapshots to public copy. */
const PULSE_LABEL_DISPLAY: Record<string, string> = {
  [HOT_ON_SOLANA.legacyPulseBadge]: "Hot Mention",
  [HOT_ON_SOLANA.pulseBadge]: "Hot Mention",
  [NEW_AND_TRENDING.legacyPulseBadge]: "New & Trending",
  [NEW_AND_TRENDING.pulseBadge]: "New & Trending",
  "Promoted boost": "Boosted",
  "New pair": "New Pair",
  "Low liquidity": "Low Liquidity",
  "Known token": "Tracked",
  "Pump.fun style": "Launchpad",
  "High risk": "Volatile",
  "Market signal only": "Board Only",
};

export function displayPulseLabel(label: string): string {
  return PULSE_LABEL_DISPLAY[label] ?? label;
}
