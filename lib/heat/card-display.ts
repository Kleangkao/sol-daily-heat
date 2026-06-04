import type { HeatCardView } from "@/lib/types/heat";
import {
  GITHUB_RELEASE_SOURCE_SLUGS,
  STATUS_SOURCE_SLUGS,
} from "@/lib/sources/rss-ingest-policy";
import { SITEMAP_DISCOVERY_SLUGS } from "@/lib/sources/sitemap-ingest-policy";

const OFFICIAL_SLUGS = new Set([
  "solana-blog",
  "helius-blog",
  "raydium-medium",
  "marinade-blog",
  "orca-medium",
  "sanctum-medium",
  "drift-medium",
  "metaplex-medium",
  "solana-status",
]);

const EDITORIAL_SLUGS = new Set([
  "solana-blog",
  "helius-blog",
  "raydium-medium",
  "marinade-blog",
  "orca-medium",
  "sanctum-medium",
  "drift-medium",
  "metaplex-medium",
  "the-block-news",
  "dlnews-rss",
  "decrypt-rss",
  "solana-status",
  "pyth-status",
  "magiceden-status",
]);

export const FEE_DISPLAY_CAP_PCT = 200;

export type SignalBadgeTone =
  | "official"
  | "editorial"
  | "protocol"
  | "market"
  | "boost"
  | "fee"
  | "caution"
  | "corroboration";

export type SignalBadge = {
  id: string;
  label: string;
  tone: SignalBadgeTone;
};

export type CardDisplayInput = Pick<
  HeatCardView,
  "title" | "scoreBreakdown" | "evidence" | "interpretationType"
> & {
  sourceSlugs?: string[];
  itemTypes?: string[];
  rankingSignals?: string[];
};

function breakdownNum(
  b: Record<string, number> | undefined,
  key: string
): number {
  const v = b?.[key];
  return typeof v === "number" ? v : 0;
}

function hasEditorialType(itemTypes: string[], slugs: string[]): boolean {
  if (itemTypes.some((t) => t === "news" || t === "manual")) return true;
  return slugs.some((s) => EDITORIAL_SLUGS.has(s));
}

function isBoostOnly(
  title: string,
  signals: string[],
  itemTypes: string[],
  slugs: string[]
): boolean {
  if (title.startsWith("DexScreener boost")) return true;
  if (signals.length > 0 && signals.every((s) => s === "boost")) {
    return !hasEditorialType(itemTypes, slugs);
  }
  return false;
}

function isMetricOnly(itemTypes: string[], slugs: string[]): boolean {
  if (itemTypes.length === 0) {
    return (
      !slugs.some((s) => EDITORIAL_SLUGS.has(s)) &&
      (slugs.some((s) => s.includes("defillama")) || slugs.some((s) => s.includes("dexscreener")))
    );
  }
  return (
    !itemTypes.some((t) => t === "news" || t === "manual") &&
    itemTypes.every((t) => t === "market" || t === "protocol")
  );
}

export function buildCardBadges(input: CardDisplayInput): SignalBadge[] {
  const badges: SignalBadge[] = [];
  const b = input.scoreBreakdown ?? {};
  const slugs = input.sourceSlugs ?? [];
  const itemTypes = input.itemTypes ?? [];
  const signals = input.rankingSignals ?? [];
  const evidenceItems = input.evidence?.evidenceItems ?? [];

  const hasOfficialSlug = slugs.some((s) => OFFICIAL_SLUGS.has(s));
  const hasSitemapDiscovery = slugs.some((s) => SITEMAP_DISCOVERY_SLUGS.has(s));
  const hasEditorialSlug = slugs.some(
    (s) => EDITORIAL_SLUGS.has(s) && !SITEMAP_DISCOVERY_SLUGS.has(s)
  );
  const boost = isBoostOnly(input.title, signals, itemTypes, slugs);
  const metricOnly = isMetricOnly(itemTypes, slugs);

  if (slugs.some((s) => GITHUB_RELEASE_SOURCE_SLUGS.has(s))) {
    badges.push({ id: "github-release", label: "GitHub release", tone: "official" });
    badges.push({ id: "infra-release", label: "Infra release", tone: "protocol" });
  }
  if (slugs.some((s) => STATUS_SOURCE_SLUGS.has(s))) {
    badges.push({ id: "status-incident", label: "Status incident", tone: "caution" });
  }

  if (hasSitemapDiscovery) {
    badges.push({
      id: "sitemap-discovery",
      label: "Sitemap discovery",
      tone: "caution",
    });
    badges.push({
      id: "headline-only",
      label: "Headline-only source",
      tone: "caution",
    });
  }

  if (
    !hasSitemapDiscovery &&
    (breakdownNum(b, "official_source_bonus") > 0 || hasOfficialSlug)
  ) {
    badges.push({ id: "official", label: "Official source", tone: "official" });
  }
  if (!hasSitemapDiscovery && breakdownNum(b, "editorial_confirmation") > 0) {
    badges.push({
      id: "editorial-confirmation",
      label: "Editorial confirmation",
      tone: "editorial",
    });
  } else if (
    !hasSitemapDiscovery &&
    hasEditorialSlug &&
    hasEditorialType(itemTypes, slugs) &&
    !boost
  ) {
    badges.push({ id: "editorial", label: "News / editorial", tone: "editorial" });
  }

  if (breakdownNum(b, "cross_type_corroboration") > 0) {
    badges.push({
      id: "cross-type",
      label: "Cross-type match",
      tone: "corroboration",
    });
  }

  const protocolEvidence = evidenceItems.some((e) => e.kind === "protocol_signal");
  const marketEvidence = evidenceItems.some((e) => e.kind === "market_signal");
  const feeInTitle = /fees?\s+(up|down)/i.test(input.title);
  const tvlInTitle = /tvl/i.test(input.title);

  if (boost || breakdownNum(b, "boost_only_cap") > 0) {
    badges.push({ id: "promoted-boost", label: "Promoted boost", tone: "boost" });
  } else if (marketEvidence || itemTypes.includes("market") || input.title.startsWith("DexScreener")) {
    badges.push({ id: "market", label: "Market signal", tone: "market" });
  }

  if (
    protocolEvidence ||
    itemTypes.includes("protocol") ||
    feeInTitle ||
    tvlInTitle ||
    slugs.some((s) => s.includes("defillama"))
  ) {
    if (!badges.some((x) => x.id === "protocol-metric")) {
      badges.push({ id: "protocol-metric", label: "Protocol metric", tone: "protocol" });
    }
  }

  if (feeInTitle || signals.includes("fees_move") || signals.includes("chain_fees")) {
    if (!badges.some((x) => x.id === "fee-spike")) {
      badges.push({ id: "fee-spike", label: "Fee movement", tone: "fee" });
    }
  }

  if (breakdownNum(b, "fee_small_base_discount") < 0) {
    badges.push({ id: "small-base", label: "Small-base caution", tone: "caution" });
  }

  if (metricOnly && !badges.some((x) => x.tone === "editorial" || x.tone === "official")) {
    if (!badges.some((x) => x.id === "metric-only")) {
      badges.push({ id: "metric-only", label: "Metric-only", tone: "caution" });
    }
  }

  if (input.interpretationType === "rule_based" && badges.length > 0) {
    /* interpretation is shown via SignalTypeBadge in footer */
  }

  const seen = new Set<string>();
  return badges.filter((badge) => {
    if (seen.has(badge.id)) return false;
    seen.add(badge.id);
    return true;
  });
}

export function parseFeeDisplay(
  title: string,
  breakdown?: Record<string, number>
): { headline: string; feeCaution?: string; rawPct?: number } {
  const m = title.match(/^(.+?):\s*fees\s+(up|down)\s+([\d,.]+)%\s*\(24h\)/i);
  if (!m) return { headline: title };

  const rawPct = parseFloat(m[3].replace(/,/g, ""));
  const direction = m[2].toLowerCase();
  const smallBase = (breakdown?.fee_small_base_discount ?? 0) < 0;
  const showCaution = smallBase || (Number.isFinite(rawPct) && rawPct > FEE_DISPLAY_CAP_PCT);

  if (!showCaution) {
    return { headline: title, rawPct: Number.isFinite(rawPct) ? rawPct : undefined };
  }

  const pctLabel =
    Number.isFinite(rawPct) && rawPct >= FEE_DISPLAY_CAP_PCT
      ? `${direction === "up" ? "+" : ""}200%+`
      : `${direction === "up" ? "+" : ""}${rawPct.toFixed(0)}%`;

  return {
    headline: `${m[1]}: fees ${direction} (24h)`,
    feeCaution: `Fees spike: ${pctLabel} shown · % capped for scoring (see evidence for raw value)`,
    rawPct: Number.isFinite(rawPct) ? rawPct : undefined,
  };
}

export function buildWhyRanked(input: CardDisplayInput): string {
  const b = input.scoreBreakdown ?? {};
  const slugs = input.sourceSlugs ?? [];
  const itemTypes = input.itemTypes ?? [];
  const signals = input.rankingSignals ?? [];
  const parts: string[] = [];

  const boost = isBoostOnly(input.title, signals, itemTypes, slugs);
  const metricOnly = isMetricOnly(itemTypes, slugs);
  const sitemapOnly = slugs.some((s) => SITEMAP_DISCOVERY_SLUGS.has(s));
  const official = breakdownNum(b, "official_source_bonus") > 0;
  const editorialConf = breakdownNum(b, "editorial_confirmation") > 0;
  const cross = breakdownNum(b, "cross_type_corroboration") > 0;
  const feePass = breakdownNum(b, "fee_threshold_passed") > 0;
  const smallBase = breakdownNum(b, "fee_small_base_discount") < 0;
  const boostPenalty = breakdownNum(b, "boost_top_heat_penalty") < 0;

  if (sitemapOnly) {
    parts.push("Headline-only · SolanaFloor sitemap discovery");
  } else if (editorialConf && official) {
    parts.push("Official + independent coverage");
  } else if (editorialConf) {
    parts.push("Multi-source editorial coverage");
  } else if (official) {
    parts.push("Official project source");
  } else if (slugs.some((s) => GITHUB_RELEASE_SOURCE_SLUGS.has(s))) {
    parts.push("GitHub infra release");
  } else if (slugs.some((s) => EDITORIAL_SLUGS.has(s))) {
    parts.push("Solana news / editorial");
  }

  if (cross) parts.push("news + metric corroboration");

  if (/fees?\s+(up|down)/i.test(input.title)) {
    if (feePass) parts.push("protocol fees · passes fee threshold");
    else parts.push("protocol fees signal");
    if (smallBase) parts.push("small-base % discounted");
  } else if (/tvl/i.test(input.title)) {
    parts.push("TVL mover · metric signal");
  } else if (boost) {
    parts.push("market signal only");
    if (boostPenalty) parts.push("promoted boost discounted");
  } else if (metricOnly) {
    parts.push("metric-only signal");
  } else if (itemTypes.includes("market")) {
    parts.push("market / token activity");
  } else if (itemTypes.includes("protocol")) {
    parts.push("protocol metric");
  }

  if (parts.length === 0) {
    parts.push("rule-based heat from clustered signals");
  }

  return parts.join(" · ");
}

export function sectionItemsMetricHeavy(items: CardDisplayInput[]): boolean {
  if (items.length === 0) return false;
  let metric = 0;
  for (const item of items) {
    const badges = buildCardBadges(item);
    if (
      badges.some(
        (b) =>
          b.id === "protocol-metric" ||
          b.id === "fee-spike" ||
          b.id === "promoted-boost" ||
          b.id === "metric-only"
      )
    ) {
      metric += 1;
    }
  }
  return metric >= Math.ceil(items.length * 0.6);
}
