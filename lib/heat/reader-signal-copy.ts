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
};

export type ReaderDisplayCopy = {
  summary: string;
  whyRanked: string;
  whyHot: string;
  pctCaution?: string;
};

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
  if (isPumpStyle(title) && itemTypes.includes("market")) {
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

  if (/fees?\s+(up|down)/i.test(title) || signals.some((s) => s === "fees_move" || s === "chain_fees")) {
    return "metric_fee";
  }
  if (/tvl/i.test(title) || signals.some((s) => s === "tvl_move" || s === "chain_tvl")) {
    return "metric_tvl";
  }

  if (isMetricOnly(itemTypes, slugs)) {
    return /tvl/i.test(title) ? "metric_tvl" : "metric_fee";
  }

  return "generic";
}

type ParsedFee = {
  protocol: string;
  direction: "up" | "down";
  pct: number;
};

export function parseFeeFromTitle(title: string): ParsedFee | null {
  const m = title.match(/^(.+?):\s*fees\s+(up|down)\s+([\d,.]+)%\s*\(24h\)/i);
  if (!m) return null;
  const pct = parseFloat(m[3].replace(/,/g, ""));
  if (!Number.isFinite(pct)) return null;
  return {
    protocol: m[1].trim(),
    direction: m[2].toLowerCase() as "up" | "down",
    pct,
  };
}

function extractFeeAmount(summary: string): string | null {
  const m = summary.match(/24h fees\s*~?\$?([\d,.]+[KMB]?)/i);
  return m ? m[1] : null;
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

function readerWhyRanked(kind: ReaderSignalKind, input: ReaderCopyInput): string {
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

function readerWhyHot(kind: ReaderSignalKind, input: ReaderCopyInput): string {
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
      return "Worth monitoring for follow-up signals and primary-source confirmation — context only, not investment advice.";
  }
}

function readerSummary(kind: ReaderSignalKind, input: ReaderCopyInput): string {
  const stored = input.summary?.trim();
  const fee = parseFeeFromTitle(input.title);

  switch (kind) {
    case "metric_fee": {
      const amount = stored ? extractFeeAmount(stored) : null;
      const amountPhrase = amount ? `about $${amount.replace(/^\$/, "")}` : "a notable level";
      if (fee) {
        const dir = fee.direction === "up" ? "sharply" : "sharply lower to";
        return `${fee.protocol} saw 24h fees move ${dir} ${amountPhrase}. The scanner flags it as a protocol-activity signal, but large percentage moves can be exaggerated when the previous baseline was low.`;
      }
      return stored && !stored.includes("adapter signal")
        ? stored
        : `${input.title.split(":")[0]?.trim() || "This protocol"} showed unusual 24h fee activity. Open evidence for the exact metric values.`;
    }
    case "metric_tvl": {
      const name = input.title.split(":")[0]?.trim() || "This protocol";
      if (stored && /tvl/i.test(stored)) {
        return `${name} registered a notable TVL move in the last 24h. The scanner treats it as protocol-activity context — verify magnitude and drivers in evidence.`;
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
      return `SolanaFloor headline: "${input.title.slice(0, 120)}". Full article text was not ingested — open the source link before relying on this summary.`;
    case "promoted_boost":
      return `DexScreener paid visibility surfaced this token (${input.title.replace(/^DexScreener boost:\s*/i, "").trim()}). Promotion increases discoverability, not fundamental validation.`;
    case "pump_style":
      return `Early market visibility on a pump-style or thin-liquidity mint (${input.title.replace(/^DexScreener boost:\s*/i, "").trim()}). High risk — verify liquidity, holders, and independent coverage.`;
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

export function buildReaderDisplayCopy(input: ReaderCopyInput): ReaderDisplayCopy {
  const kind = classifyReaderSignal(input);
  const fee = parseFeeFromTitle(input.title);
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
    evidence: topic.evidence ?? undefined,
    interpretationType: topic.interpretationType,
    sourceSlugs,
    itemTypes,
    rankingSignals,
    sourceCount: topic.uniqueSourceCount,
    headlineOnly: topic.headlineOnlySources,
  };
}
