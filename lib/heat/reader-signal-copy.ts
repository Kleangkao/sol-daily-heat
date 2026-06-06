import type { HeatCardView } from "@/lib/types/heat";
import type { TopicDetailView } from "@/lib/types/topic-detail";
import type { InterpretationType, ScoreBreakdown } from "@/lib/types/db";
import type { TopicEvidence } from "@/lib/types/evidence";
import {
  GITHUB_RELEASE_SOURCE_SLUGS,
  STATUS_SOURCE_SLUGS,
} from "@/lib/sources/rss-ingest-policy";
import { SITEMAP_DISCOVERY_SLUGS } from "@/lib/sources/sitemap-ingest-policy";

const FEE_DISPLAY_CAP_PCT = 200;

const METRIC_FEE_GENERIC_SUMMARY =
  "A protocol fee signal moved sharply enough to trigger the scanner. Check the evidence panel for the raw source values before treating it as sustained momentum.";

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

export type ReaderSignalKind =
  | "metric_fee"
  | "metric_tvl"
  | "single_editorial"
  | "multi_editorial"
  | "headline_only"
  | "promoted_boost"
  | "pump_style"
  | "status_incident"
  | "github_release"
  | "generic";

export type ReaderCopyInput = {
  title: string;
  summary?: string;
  whyHot?: string;
  scoreBreakdown?: ScoreBreakdown | Record<string, number>;
  evidence?: TopicEvidence;
  interpretationType?: InterpretationType;
  sourceSlugs?: string[];
  itemTypes?: string[];
  rankingSignals?: string[];
  sourceCount?: number;
  headlineOnly?: boolean;
  category?: string;
  protocols?: Array<{ name: string; slug: string }>;
};

export type ReaderDisplayCopy = {
  summary: string;
  whyRanked: string;
  whyHot: string;
  pctCaution?: string;
};

export type ParsedFeeMetric = {
  protocol: string;
  direction: "up" | "down";
  pct: number;
};

export type ParsedTvlMetric = {
  protocol: string;
  direction: "up" | "down";
  pct: number;
};

export type HomepageMetricKind = "fee" | "tvl" | "volume" | "generic";

function breakdownNum(
  b: ScoreBreakdown | Record<string, number> | undefined,
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

function isPumpStyle(title: string, category?: string): boolean {
  if (/pump\.fun|pump-style|pumpfun/i.test(title)) return true;
  if (/…pump\b/i.test(title) || /\bpump\b/i.test(title)) return true;
  return category === "meme" && /pump/i.test(title);
}

function directionFromParts(dirWord?: string, sign?: string): "up" | "down" {
  if (dirWord) return dirWord.toLowerCase() === "down" ? "down" : "up";
  if (sign === "-") return "down";
  return "up";
}

function parsePct(raw: string): number | null {
  const pct = parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(pct) ? pct : null;
}

/**
 * Parse fee/revenue metric fields from title or summary across common pipeline formats.
 */
export function parseFeeMetric(title: string, summary?: string): ParsedFeeMetric | null {
  const titlePatterns: Array<{
    re: RegExp;
    protocol: number;
    dir?: number;
    sign?: number;
    pct: number;
  }> = [
    {
      re: /^(.+?):\s*fees\s+(up|down)\s+([\d,.]+)%\s*\(24h\)/i,
      protocol: 1,
      dir: 2,
      pct: 3,
    },
    {
      re: /^(.+?)\s*·\s*fees\s+(up|down)\s+([\d,.]+)%\s*\(24h\)/i,
      protocol: 1,
      dir: 2,
      pct: 3,
    },
    {
      re: /^(.+?)\s+fees\s+(up|down)\s+([\d,.]+)%\s*\(24h\)/i,
      protocol: 1,
      dir: 2,
      pct: 3,
    },
    {
      re: /^(.+?)\s+chain\s+fees\s+([+-]?)([\d,.]+)%\s*\(24h\)/i,
      protocol: 1,
      sign: 2,
      pct: 3,
    },
    {
      re: /^(.+?)\s+fees\s+([+-])([\d,.]+)%\s*\(24h\)/i,
      protocol: 1,
      sign: 2,
      pct: 3,
    },
    {
      re: /^(.+?):\s*fees\s+(up|down)\s+([\d,.]+)%/i,
      protocol: 1,
      dir: 2,
      pct: 3,
    },
    {
      re: /^(.+?)\s+revenue\s+([+-])([\d,.]+)%\s*\(24h\)/i,
      protocol: 1,
      sign: 2,
      pct: 3,
    },
    {
      re: /^(.+?)\s+revenue\s+(up|down)\s+([\d,.]+)%\s*\(24h\)/i,
      protocol: 1,
      dir: 2,
      pct: 3,
    },
  ];

  for (const pattern of titlePatterns) {
    const m = title.match(pattern.re);
    if (!m) continue;
    const pct = parsePct(m[pattern.pct]);
    if (pct == null) continue;
    return {
      protocol: m[pattern.protocol].trim(),
      direction: directionFromParts(
        pattern.dir != null ? m[pattern.dir] : undefined,
        pattern.sign != null ? m[pattern.sign] : undefined
      ),
      pct,
    };
  }

  const sources = [summary, title].filter((s): s is string => Boolean(s?.trim()));
  const embeddedPatterns: Array<{
    re: RegExp;
    protocol: number;
    dir?: number;
    sign?: number;
    pct: number;
  }> = [
    {
      re: /(.+?)\s*·\s*fees\s+(up|down)\s+([\d,.]+)%/i,
      protocol: 1,
      dir: 2,
      pct: 3,
    },
    {
      re: /(.+?)\s+fees\s+([+-])([\d,.]+)%\s*\(24h\)/i,
      protocol: 1,
      sign: 2,
      pct: 3,
    },
    {
      re: /fees\s+(up|down)\s+([\d,.]+)%\s*\(24h\)/i,
      protocol: 0,
      dir: 1,
      pct: 2,
    },
  ];

  for (const source of sources) {
    for (const pattern of embeddedPatterns) {
      const m = source.match(pattern.re);
      if (!m) continue;
      const pct = parsePct(m[pattern.pct]);
      if (pct == null) continue;
      const protocol =
        pattern.protocol > 0 ? m[pattern.protocol].trim().split(":")[0]?.trim() : "";
      return {
        protocol: protocol || title.split(":")[0]?.trim() || title.split("·")[0]?.trim() || "Protocol",
        direction: directionFromParts(
          pattern.dir != null ? m[pattern.dir] : undefined,
          pattern.sign != null ? m[pattern.sign] : undefined
        ),
        pct,
      };
    }
  }

  return null;
}

/** @deprecated Use parseFeeMetric */
export function parseFeeFromTitle(title: string): ParsedFeeMetric | null {
  return parseFeeMetric(title);
}

/** Parse TVL metric fields from title or summary. */
export function parseTvlMetric(title: string, summary?: string): ParsedTvlMetric | null {
  const titlePatterns: Array<{
    re: RegExp;
    protocol: number;
    dir?: number;
    sign?: number;
    pct: number;
  }> = [
    {
      re: /^(.+?):\s*TVL\s+(up|down)\s+([\d,.]+)%\s*\(24h\)/i,
      protocol: 1,
      dir: 2,
      pct: 3,
    },
    {
      re: /^(.+?)\s+TVL\s+(up|down)\s+([\d,.]+)%\s*\(24h\)/i,
      protocol: 1,
      dir: 2,
      pct: 3,
    },
    {
      re: /^(.+?)\s+TVL\s+([+-])([\d,.]+)%\s*\(24h\)/i,
      protocol: 1,
      sign: 2,
      pct: 3,
    },
  ];

  for (const pattern of titlePatterns) {
    const m = title.match(pattern.re);
    if (!m) continue;
    const pct = parsePct(m[pattern.pct]);
    if (pct == null) continue;
    return {
      protocol: m[pattern.protocol].trim(),
      direction: directionFromParts(
        pattern.dir != null ? m[pattern.dir] : undefined,
        pattern.sign != null ? m[pattern.sign] : undefined
      ),
      pct,
    };
  }

  for (const text of [summary, title].filter(Boolean)) {
    const m = text!.match(/TVL\s+(up|down)\s+([\d,.]+)%/i);
    if (!m) continue;
    const pct = parsePct(m[2]);
    if (pct == null) continue;
    return {
      protocol: title.split(":")[0]?.trim() || "Protocol",
      direction: m[1].toLowerCase() === "down" ? "down" : "up",
      pct,
    };
  }

  return null;
}

export function isMetricTvlSignal(input: ReaderCopyInput): boolean {
  const signals = input.rankingSignals ?? [];
  const title = input.title;
  const summary = input.summary ?? "";

  if (signals.some((s) => s === "tvl_move" || s === "chain_tvl")) {
    return true;
  }
  if (parseTvlMetric(title, summary)) {
    return true;
  }
  if (/:\s*TVL\b/i.test(title) || /\bTVL\s+(up|down|[+-])/i.test(title)) {
    return true;
  }
  return /\bTVL\s+(up|down)/i.test(summary);
}

export function detectHomepageMetricKind(input: ReaderCopyInput): HomepageMetricKind | null {
  const title = input.title;
  const summary = input.summary ?? "";
  const combined = `${title} ${summary}`;

  if (isMetricTvlSignal(input)) {
    return "tvl";
  }

  if (
    /\bvolume\b/i.test(combined) &&
    (/\bvolume\s+(up|down)/i.test(combined) || /\bvolume\s+[+-]/i.test(title))
  ) {
    return "volume";
  }

  if (isMetricFeeSignal(input) || parseFeeMetric(title, summary)) {
    return "fee";
  }

  if (isMetricOnly(input.itemTypes ?? [], input.sourceSlugs ?? [])) {
    return "generic";
  }

  return null;
}

export function isMetricFeeSignal(input: ReaderCopyInput): boolean {
  const slugs = input.sourceSlugs ?? [];
  const itemTypes = input.itemTypes ?? [];
  const signals = input.rankingSignals ?? [];
  const title = input.title;
  const summary = input.summary ?? "";
  const combined = `${title} ${summary}`;

  if (isMetricTvlSignal(input)) {
    return false;
  }

  if (slugs.some((s) => s === "defillama-fees-solana" || s.includes("defillama-fees"))) {
    return true;
  }
  if (breakdownNum(input.scoreBreakdown, "fee_threshold_passed") > 0) {
    return true;
  }
  if (signals.some((s) => s === "fees_move" || s === "chain_fees")) {
    return true;
  }
  if (
    input.evidence?.evidenceItems?.some(
      (e) => e.kind === "protocol_signal" && /fee|revenue/i.test(e.label + e.text)
    )
  ) {
    return true;
  }

  const hasFeeMetricText =
    /(?:\bfee|\bfees|revenue)\b/i.test(combined) &&
    (/(?:24h|\(24h\))/i.test(combined) ||
      /fees?\s+(up|down|[+-])/i.test(combined) ||
      /chain\s+fees/i.test(combined));

  if (hasFeeMetricText) {
    if (isMetricOnly(itemTypes, slugs)) return true;
    if (slugs.some((s) => s.includes("defillama"))) return true;
    if (input.category === "defi" && slugs.some((s) => s.includes("defillama"))) {
      return true;
    }
  }

  if (/fees?\s+(up|down)/i.test(title) || /chain\s+fees/i.test(title)) {
    return true;
  }

  return false;
}

function extractFeeAmount(...texts: Array<string | undefined>): string | null {
  for (const text of texts) {
    if (!text) continue;
    const patterns = [
      /24h fees\s*~?\s*\$?([\d,.]+[KMB]?)/i,
      /fees\s*~?\s*\$?([\d,.]+[KMB]?)/i,
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m) return m[1];
    }
  }
  return null;
}

function largePctCaution(
  pct: number | undefined,
  breakdown?: ScoreBreakdown | Record<string, number>
): string | undefined {
  const smallBase = (breakdown?.fee_small_base_discount ?? 0) < 0;
  if (pct != null && pct > FEE_DISPLAY_CAP_PCT) {
    return "Large % move; baseline may be low. Check evidence for raw value.";
  }
  if (smallBase) {
    return "Large % move; baseline may be low. Check evidence for raw value.";
  }
  return undefined;
}

function readerWhyRanked(kind: ReaderSignalKind, _input: ReaderCopyInput): string {
  switch (kind) {
    case "metric_fee":
      return "Fee activity crossed the scanner threshold after a sharp 24h move.";
    case "metric_tvl":
      return "TVL movement crossed the scanner’s protocol-activity threshold.";
    case "single_editorial":
      return "Primary-source or editorial coverage matched the scanner’s Solana relevance filters.";
    case "multi_editorial":
      return "Multiple sources independently covered the same Solana-related story.";
    case "headline_only":
      return "Early headline signal from SolanaFloor; full context may still be limited.";
    case "promoted_boost":
    case "pump_style":
      return "Detected through DexScreener visibility signals.";
    case "status_incident":
      return "Status or incident feed reported operational change on Solana infrastructure.";
    case "github_release":
      return "New GitHub release matched builder/infra watch filters.";
    default:
      return "Rule-based heat from clustered Solana signals today.";
  }
}

function readerWhyHot(kind: ReaderSignalKind, _input: ReaderCopyInput): string {
  switch (kind) {
    case "metric_fee":
      return "A sudden fee spike can point to unusual protocol usage, incentives, routing changes, or a one-off event. Verify the raw source before treating it as sustained momentum.";
    case "metric_tvl":
      return "A sharp TVL move can reflect capital flows, incentive shifts, or reporting noise. Check the underlying protocol data before treating it as a durable trend.";
    case "single_editorial":
      return "This is an early narrative signal. Watch for follow-up coverage or on-chain evidence before treating it as broadly confirmed.";
    case "multi_editorial":
      return "Cross-source coverage makes this more likely to be an ecosystem narrative worth tracking.";
    case "headline_only":
      return "Headline-only items are useful for discovery, but need primary-source confirmation.";
    case "promoted_boost":
    case "pump_style":
      return "This is a market-discovery signal only. Paid boosts and pump-style mints are high risk and not validation.";
    case "status_incident":
      return "Operational signals can affect builders and users quickly. Confirm resolution status on the official status page.";
    case "github_release":
      return "Release notes can shift builder attention when they touch performance, tooling, or validator/client behavior.";
    default:
      return "Worth monitoring for follow-up signals and primary-source confirmation. Context only, not investment advice.";
  }
}

function metricFeeSummary(input: ReaderCopyInput): string {
  const fee = parseFeeMetric(input.title, input.summary);
  const amount = extractFeeAmount(input.summary, input.title);

  if (fee?.protocol && (amount || fee.pct != null)) {
    const amountPhrase = amount ? `about $${amount.replace(/^\$/, "")}` : "a notable level";
    const dir = fee.direction === "up" ? "sharply" : "sharply lower to";
    return `${fee.protocol} saw 24h fees move ${dir} ${amountPhrase}. The scanner flags it as a protocol-activity signal, but large percentage moves can be exaggerated when the previous baseline was low.`;
  }

  if (fee?.protocol) {
    return `${fee.protocol} saw an unusual 24h fee move. The scanner flags it as a protocol-activity signal, but large percentage moves can be exaggerated when the previous baseline was low.`;
  }

  return METRIC_FEE_GENERIC_SUMMARY;
}

function readerSummary(kind: ReaderSignalKind, input: ReaderCopyInput): string {
  const stored = input.summary?.trim();

  switch (kind) {
    case "metric_fee":
      return metricFeeSummary(input);
    case "metric_tvl": {
      const name = input.title.split(":")[0]?.trim() || "This protocol";
      if (stored && /tvl/i.test(stored) && !/adapter signal/i.test(stored)) {
        return `${name} registered a notable TVL move in the last 24h. The scanner treats it as protocol-activity context. Verify magnitude and drivers in evidence.`;
      }
      return `${name} registered a notable TVL move in the last 24h. Check evidence for the underlying DefiLlama values.`;
    }
    case "single_editorial": {
      if (stored && stored.length > 40 && !/adapter signal|fees move/i.test(stored)) {
        return stored;
      }
      return `Editorial coverage surfaced "${input.title.slice(0, 120)}". Treat as an early narrative until additional sources or on-chain signals appear.`;
    }
    case "multi_editorial": {
      if (stored && stored.length > 40 && !/adapter signal/i.test(stored)) {
        return stored;
      }
      return `Several outlets are covering the same story: ${input.title.slice(0, 140)}. Cross-source repetition increases narrative visibility in today's scanner.`;
    }
    case "headline_only":
      return `SolanaFloor headline: "${input.title.slice(0, 120)}". Full article text was not ingested. Open the source link before relying on this summary.`;
    case "promoted_boost":
      return `DexScreener paid visibility surfaced this token (${input.title.replace(/^DexScreener boost:\s*/i, "").trim()}). Promotion increases discoverability, not fundamental validation.`;
    case "pump_style":
      return `Early market visibility on a pump-style or thin-liquidity mint (${input.title.replace(/^DexScreener boost:\s*/i, "").trim()}). High risk. Verify liquidity, holders, and independent coverage.`;
    case "status_incident":
      return stored && stored.length > 20
        ? stored
        : `Infrastructure status update: ${input.title}. Confirm current status on the official page linked in evidence.`;
    case "github_release":
      return stored && stored.length > 20
        ? stored
        : `New release activity: ${input.title}. See release notes in evidence for version and scope.`;
    default:
      if (stored && !/^Clustered from|adapter signal/i.test(stored)) {
        return stored;
      }
      return input.title;
  }
}

export function classifyReaderSignal(input: ReaderCopyInput): ReaderSignalKind {
  const slugs = input.sourceSlugs ?? [];
  const itemTypes = input.itemTypes ?? [];
  const signals = input.rankingSignals ?? [];
  const title = input.title;

  if (input.headlineOnly || slugs.some((s) => SITEMAP_DISCOVERY_SLUGS.has(s))) {
    return "headline_only";
  }
  if (slugs.some((s) => STATUS_SOURCE_SLUGS.has(s))) {
    return "status_incident";
  }
  if (slugs.some((s) => GITHUB_RELEASE_SOURCE_SLUGS.has(s))) {
    return "github_release";
  }
  if (isBoostOnly(title, signals, itemTypes, slugs)) {
    return "promoted_boost";
  }
  if (isPumpStyle(title, input.category) && itemTypes.includes("market")) {
    return "pump_style";
  }

  const editorialConf = breakdownNum(input.scoreBreakdown, "editorial_confirmation") > 0;
  const editorialCount = input.sourceCount ?? 0;
  const hasEditorial = hasEditorialType(itemTypes, slugs);

  if (hasEditorial && (editorialConf || editorialCount > 1)) {
    return "multi_editorial";
  }
  if (hasEditorial && !isMetricOnly(itemTypes, slugs)) {
    return "single_editorial";
  }

  if (isMetricTvlSignal(input)) {
    return "metric_tvl";
  }
  if (isMetricFeeSignal(input)) {
    return "metric_fee";
  }

  if (isMetricOnly(itemTypes, slugs)) {
    return detectHomepageMetricKind(input) === "tvl" ? "metric_tvl" : "metric_fee";
  }

  return "generic";
}

export function buildReaderDisplayCopy(input: ReaderCopyInput): ReaderDisplayCopy {
  const kind = classifyReaderSignal(input);
  const fee = parseFeeMetric(input.title, input.summary);
  const pctCaution = largePctCaution(fee?.pct, input.scoreBreakdown);

  return {
    summary: readerSummary(kind, input),
    whyRanked: readerWhyRanked(kind, input),
    whyHot: readerWhyHot(kind, input),
    pctCaution,
  };
}

export function readerCopyInputFromCard(item: HeatCardView): ReaderCopyInput {
  return {
    title: item.title,
    summary: item.summary,
    whyHot: item.whyHot,
    scoreBreakdown: item.scoreBreakdown,
    evidence: item.evidence,
    interpretationType: item.interpretationType,
    sourceSlugs: item.sourceSlugs,
    itemTypes: item.itemTypes,
    rankingSignals: item.rankingSignals,
    sourceCount: item.sourceCount,
    category: item.category,
    protocols: item.relatedProjects.map((p) => ({
      name: p.name,
      slug: p.slug ?? p.name.toLowerCase().replace(/\s+/g, "-"),
    })),
  };
}

export function readerCopyInputFromTopic(topic: TopicDetailView): ReaderCopyInput {
  const sourceSlugs = Array.from(new Set(topic.timeline.map((t) => t.sourceSlug)));
  const itemTypes = Array.from(new Set(topic.timeline.map((t) => t.itemType)));
  const rankingSignals = Array.from(
    new Set(topic.timeline.map((t) => t.signal).filter((s): s is string => Boolean(s)))
  );

  return {
    title: topic.title,
    summary: topic.summary,
    whyHot: topic.whyHot,
    scoreBreakdown: topic.scoreBreakdown,
    protocols: topic.protocols.map((p) => ({ name: p.name, slug: p.slug })),
    evidence: topic.evidence ?? undefined,
    interpretationType: topic.interpretationType,
    sourceSlugs,
    itemTypes,
    rankingSignals,
    sourceCount: topic.uniqueSourceCount,
    headlineOnly: topic.headlineOnlySources,
    category: topic.category,
  };
}
