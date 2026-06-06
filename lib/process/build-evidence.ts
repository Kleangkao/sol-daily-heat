import type { RawItem, Source, ScoreBreakdown, TopicCategory, InterpretationType } from "@/lib/types/db";
import type {
  EvidenceItem,
  EvidenceKind,
  SourceLink,
  SignalBreakdownEntry,
  TopicEvidence,
} from "@/lib/types/evidence";
import type { ClusterMetrics } from "./cluster-metrics";
import { formatSignalLabels } from "./cluster-metrics";
import { isGithubReleaseSourceSlug } from "@/lib/sources/rss-ingest-policy";

const SCORE_LABELS: Record<string, string> = {
  source_diversity: "Source diversity",
  recency: "Recency",
  volume_signal: "Market / protocol activity",
  keyword_match: "Solana relevance",
  reliability_weight: "Source reliability",
  novelty: "Novelty vs prior day",
  tvl_delta: "TVL movement",
  boost_only_cap: "Boost-only cap (paid leaderboard)",
  boost_top_heat_penalty: "Top Heat boost penalty",
  official_source_bonus: "Official project source",
  editorial_confirmation: "Multi-editorial confirmation",
  cross_type_corroboration: "News + market/protocol corroboration",
  fee_threshold_passed: "Fees threshold met",
  fee_small_base_discount: "Small-base fees discount",
};

function isValidUrl(url: unknown): url is string {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
}

function itemTypeOf(item: RawItem): string {
  return (item.metadata_json?.item_type as string) ?? "news";
}

function evidenceKindForItemType(itemType: string): EvidenceKind {
  if (itemType === "market") return "market_signal";
  if (itemType === "protocol") return "protocol_signal";
  return "fact";
}

function linkLabel(item: RawItem & { sources?: Source }, url: string): string {
  const slug = item.sources?.slug ?? "";
  if (item.metadata_json?.sitemap_discovery === true) return "SolanaFloor article";
  if (slug.includes("dexscreener")) return "DexScreener";
  if (slug.includes("defillama")) return "DefiLlama";
  if (isGithubReleaseSourceSlug(slug)) return "GitHub release";
  if (itemTypeOf(item) === "news") return item.sources?.name ?? "Article";
  return item.sources?.name ?? "Source";
}

function buildWatchNext(
  category: TopicCategory,
  itemTypes: string[],
  uniqueSignals: string[]
): string {
  if (itemTypes.includes("market")) {
    if (uniqueSignals.includes("boost")) {
      return "Paid DexScreener boost signal. Watch persistence, liquidity, and independent coverage beyond promotion.";
    }
    return "Watch 24h volume, liquidity depth, and pair age. Context only, not a trade signal.";
  }
  if (itemTypes.includes("protocol") || category === "defi") {
    return "Watch TVL trend over the next 24–48h and any protocol governance or audit announcements.";
  }
  if (category === "regulatory") {
    return "Watch for official filings, enforcement updates, and ecosystem responses.";
  }
  return "Watch for additional independent coverage and primary-source confirmation.";
}

function buildInterpretationNote(
  interpretationType: InterpretationType,
  items: Array<RawItem & { sources?: Source }>
): string {
  const headlineOnly = items.some((i) => i.metadata_json?.sitemap_discovery === true);
  if (headlineOnly) {
    return "Article body was not ingested. Open source to verify.";
  }
  if (interpretationType === "ai") {
    return "Summary may include AI-assisted text when keys are configured; heat rank remains rule-based.";
  }
  return "Summary and heat rank are rule-based interpretations of ingested signals. Not investment advice.";
}

export function buildSignalBreakdown(
  scoreBreakdown: ScoreBreakdown
): SignalBreakdownEntry[] {
  return Object.entries(scoreBreakdown)
    .filter(([, v]) => typeof v === "number" && v !== 0)
    .map(([key, points]) => ({
      key,
      label: SCORE_LABELS[key] ?? key.replace(/_/g, " "),
      points: points as number,
      kind: key === "reliability_weight" || key === "keyword_match" ? "interpretation" : "fact",
    }));
}

function evidenceFromRawItem(item: RawItem & { sources?: Source }): EvidenceItem | null {
  const itemType = itemTypeOf(item);
  const kind = evidenceKindForItemType(itemType);
  const url = isValidUrl(item.canonical_url) ? item.canonical_url.trim() : undefined;
  const sourceName = item.sources?.name;
  const snippet = (item.snippet ?? "").trim();
  const title = item.title.trim();

  let label = "Source";
  const signal = item.metadata_json?.signal as string | undefined;
  if (item.metadata_json?.sitemap_discovery === true) {
    label = "Sitemap discovery (headline-only)";
  } else if (kind === "market_signal" && signal === "boost") {
    label = "Promoted boost (DexScreener)";
  } else if (kind === "market_signal") label = "Market signal";
  else if (kind === "protocol_signal") label = "Protocol metric";
  else label = "News / source";

  const text =
    item.metadata_json?.sitemap_discovery === true
      ? `${title}. Article body was not ingested. Open source to verify.`
      : snippet || title;
  if (!text) return null;

  return { kind, label, text: text.slice(0, 320), url, sourceName };
}

export function buildTopicEvidence(input: {
  title: string;
  summary: string;
  whyHot: string;
  category: TopicCategory;
  interpretationType: InterpretationType;
  items: Array<RawItem & { sources?: Source }>;
  scoreBreakdown: ScoreBreakdown;
  clusterMetrics: ClusterMetrics;
}): TopicEvidence {
  const seenKeys = new Set<string>();
  const evidenceItems: EvidenceItem[] = [];

  for (const item of input.items) {
    const row = evidenceFromRawItem(item);
    if (!row) continue;
    const dedupeKey = row.url
      ? `${row.kind}:${row.url}`
      : row.text.toLowerCase().slice(0, 100);
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);
    evidenceItems.push(row);
  }

  const linkMap = new Map<string, SourceLink>();
  const linkItems = [...input.items].sort((a, b) => {
    const aS = a.metadata_json?.sitemap_discovery === true ? 0 : 1;
    const bS = b.metadata_json?.sitemap_discovery === true ? 0 : 1;
    return aS - bS;
  });
  for (const item of linkItems) {
    if (!isValidUrl(item.canonical_url)) continue;
    const url = item.canonical_url.trim();
    if (linkMap.has(url)) continue;
    linkMap.set(url, { label: linkLabel(item, url), url });
  }

  const signalBreakdown = buildSignalBreakdown(input.scoreBreakdown);

  const facts: string[] = [];
  const interpretations: string[] = [];

  for (const e of evidenceItems) {
    if (e.kind === "interpretation") interpretations.push(e.text);
    else facts.push(`${e.label}: ${e.text}`);
  }
  facts.push(`Cluster headline: ${input.title}`);
  if (input.clusterMetrics.uniqueSignals.length > 0) {
    facts.push(`Signal types: ${formatSignalLabels(input.clusterMetrics.uniqueSignals)}`);
  }

  interpretations.push(input.whyHot);
  interpretations.push(buildInterpretationNote(input.interpretationType, input.items));
  for (const s of signalBreakdown.filter((x) => x.kind === "interpretation")) {
    const sign = s.points > 0 ? "+" : "";
    interpretations.push(`${s.label} (${sign}${s.points} heat points)`);
  }

  return {
    whatHappened: input.summary,
    evidenceItems,
    sourceLinks: Array.from(linkMap.values()),
    signalBreakdown,
    interpretationNote: buildInterpretationNote(input.interpretationType, input.items),
    watchNext: buildWatchNext(
      input.category,
      input.items.map((i) => itemTypeOf(i)),
      input.clusterMetrics.uniqueSignals
    ),
    factVsInterpretation: { facts, interpretations },
  };
}

/** Parse evidence persisted on topics.metadata_json.evidence */
export function parseStoredEvidence(raw: unknown): TopicEvidence | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.whatHappened !== "string") return undefined;

  const evidenceItems = Array.isArray(o.evidenceItems)
    ? (o.evidenceItems as EvidenceItem[])
    : [];
  const sourceLinks = Array.isArray(o.sourceLinks) ? (o.sourceLinks as SourceLink[]) : [];
  const signalBreakdown = Array.isArray(o.signalBreakdown)
    ? (o.signalBreakdown as SignalBreakdownEntry[])
    : [];
  const factVs = o.factVsInterpretation as TopicEvidence["factVsInterpretation"] | undefined;

  return {
    whatHappened: o.whatHappened,
    evidenceItems,
    sourceLinks,
    signalBreakdown,
    interpretationNote:
      typeof o.interpretationNote === "string" ? o.interpretationNote : "",
    watchNext: typeof o.watchNext === "string" ? o.watchNext : "",
    factVsInterpretation: factVs ?? { facts: [], interpretations: [] },
  };
}
