import { buildReaderDisplayCopy, parseFeeMetric } from "@/lib/heat/reader-signal-copy";
import type { HeatCardView } from "@/lib/types/heat";
import {
  GITHUB_RELEASE_SOURCE_SLUGS,
  STATUS_SOURCE_SLUGS,
} from "@/lib/sources/rss-ingest-policy";
import { SITEMAP_DISCOVERY_SLUGS } from "@/lib/sources/sitemap-ingest-policy";

import { OFFICIAL_SOURCE_SLUGS } from "@/lib/scoring/official-sources";

/** Third-party media / analysis — not project-owned announcement feeds. */
const THIRD_PARTY_EDITORIAL_SLUGS = new Set([
  "the-block-news",
  "dlnews-rss",
  "decrypt-rss",
  "coindesk-rss",
  "cointelegraph-solana-rss",
  "utoday-rss",
  "thedefiant-rss",
]);

const STATUS_AND_DISCOVERY_SLUGS = new Set([
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

function hasNewsItemType(itemTypes: string[]): boolean {
  return itemTypes.some((t) => t === "news" || t === "manual");
}

function isThirdPartyEditorial(slugs: string[], itemTypes: string[]): boolean {
  if (!hasNewsItemType(itemTypes)) return false;
  if (slugs.some((s) => THIRD_PARTY_EDITORIAL_SLUGS.has(s))) return true;
  return slugs.some(
    (s) =>
      !OFFICIAL_SOURCE_SLUGS.has(s) &&
      !SITEMAP_DISCOVERY_SLUGS.has(s) &&
      !GITHUB_RELEASE_SOURCE_SLUGS.has(s) &&
      !STATUS_SOURCE_SLUGS.has(s) &&
      (s.includes("rss") || s.includes("news"))
  );
}

function isBoostOnly(
  title: string,
  signals: string[],
  itemTypes: string[],
  slugs: string[]
): boolean {
  if (title.startsWith("DexScreener boost")) return true;
  if (signals.length > 0 && signals.every((s) => s === "boost")) {
    return !hasNewsItemType(itemTypes);
  }
  return false;
}

function isMetricOnly(itemTypes: string[], slugs: string[]): boolean {
  if (itemTypes.length === 0) {
    return (
      !slugs.some((s) => OFFICIAL_SOURCE_SLUGS.has(s) || THIRD_PARTY_EDITORIAL_SLUGS.has(s)) &&
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

  const hasOfficialSlug = slugs.some((s) => OFFICIAL_SOURCE_SLUGS.has(s));
  const hasSitemapDiscovery = slugs.some((s) => SITEMAP_DISCOVERY_SLUGS.has(s));
  const thirdPartyEditorial = isThirdPartyEditorial(slugs, itemTypes);
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
    badges.push({ id: "official", label: "Primary source", tone: "official" });
    if (hasNewsItemType(itemTypes) && !boost && !metricOnly) {
      badges.push({ id: "ecosystem-update", label: "Ecosystem update", tone: "protocol" });
    }
  } else if (!hasSitemapDiscovery && breakdownNum(b, "editorial_confirmation") > 0) {
    badges.push({
      id: "editorial-confirmation",
      label: "Multi-source coverage",
      tone: "editorial",
    });
  } else if (!hasSitemapDiscovery && thirdPartyEditorial && !boost) {
    badges.push({ id: "editorial", label: "News / editorial", tone: "editorial" });
  } else if (
    !hasSitemapDiscovery &&
    slugs.some((s) => STATUS_AND_DISCOVERY_SLUGS.has(s))
  ) {
    badges.push({ id: "status-feed", label: "Status feed", tone: "caution" });
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
  const fee = parseFeeMetric(title);
  if (!fee) return { headline: title };

  const rawPct = fee.pct;
  const direction = fee.direction;
  const smallBase = (breakdown?.fee_small_base_discount ?? 0) < 0;
  const showCaution = smallBase || (Number.isFinite(rawPct) && rawPct > FEE_DISPLAY_CAP_PCT);

  if (!showCaution) {
    return { headline: title, rawPct: Number.isFinite(rawPct) ? rawPct : undefined };
  }

  const headlineSuffix =
    title.includes("chain fees") || /chain\s+fees/i.test(title)
      ? "chain fees move (24h)"
      : `fees ${direction} (24h)`;

  return {
    headline: `${fee.protocol}: ${headlineSuffix}`,
    feeCaution: "Large % move; baseline may be low. Check evidence for raw value.",
    rawPct: Number.isFinite(rawPct) ? rawPct : undefined,
  };
}

export function buildWhyRanked(input: CardDisplayInput): string {
  return buildReaderDisplayCopy(input).whyRanked;
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
