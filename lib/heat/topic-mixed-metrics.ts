import type { TopicDetailView, TopicTimelineEntry } from "@/lib/types/topic-detail";
import {
  classifyReaderSignal,
  parseFeeMetric,
  parseTvlMetric,
  type ReaderCopyInput,
} from "@/lib/heat/reader-signal-copy";
import {
  GITHUB_RELEASE_SOURCE_SLUGS,
  STATUS_SOURCE_SLUGS,
} from "@/lib/sources/rss-ingest-policy";

export type TopicMetricSignalKind = "fee" | "tvl";

export type TopicMetricSignalRow = {
  kind: TopicMetricSignalKind;
  label: string;
  title: string;
  currentValueLabel?: string;
  changePctLabel?: string;
  sourceName: string;
  snapshotLabel?: string;
};

export type TopicMixedMetricsDisplay = {
  protocolName: string;
  isMixed: boolean;
  signals: TopicMetricSignalRow[];
  contextNote: string;
};

const FEE_SIGNALS = new Set(["fees_move", "chain_fees"]);
const TVL_SIGNALS = new Set(["tvl_move", "chain_tvl"]);

const SOURCE_BY_SLUG: Record<string, string> = {
  "defillama-fees-solana": "DefiLlama Solana Fees",
  "defillama-solana": "DefiLlama Solana TVL",
};

function parsePct(raw: string): number | null {
  const pct = parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(pct) ? pct : null;
}

function parseUsdToken(raw: string): number | null {
  const m = raw.trim().match(/^([\d,.]+)\s*([KMB])?$/i);
  if (!m) return null;
  const base = parseFloat(m[1].replace(/,/g, ""));
  if (!Number.isFinite(base)) return null;
  const suffix = (m[2] ?? "").toUpperCase();
  if (suffix === "K") return base * 1_000;
  if (suffix === "M") return base * 1_000_000;
  if (suffix === "B") return base * 1_000_000_000;
  return base;
}

function formatUsdLabel(amount: number): string {
  if (amount >= 1_000_000_000) return `~$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `~$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 10_000) return `~$${Math.round(amount / 1_000)}K`;
  if (amount >= 1_000) return `~$${(amount / 1_000).toFixed(1)}K`;
  if (amount >= 100) return `~$${Math.round(amount)}`;
  return `~$${amount.toFixed(1)}`;
}

function extractValueFromText(text: string, kind: TopicMetricSignalKind): string | undefined {
  const patterns =
    kind === "fee"
      ? [/24h fees\s*~?\s*\$?([\d,.]+[KMB]?)/i, /fees\s*~?\s*\$?([\d,.]+[KMB]?)/i]
      : [/TVL\s*~?\s*\$?([\d,.]+[KMB]?)/i, /24h TVL\s*~?\s*\$?([\d,.]+[KMB]?)/i];

  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const amount = parseUsdToken(m[1]);
    if (amount != null) return formatUsdLabel(amount);
  }
  return undefined;
}

function formatSnapshot(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function entryTimestamp(entry: TopicTimelineEntry): number {
  const iso = entry.publishedAt ?? entry.fetchedAt;
  return iso ? new Date(iso).getTime() : 0;
}

function resolveSourceName(entry: TopicTimelineEntry, kind: TopicMetricSignalKind): string {
  if (entry.sourceName?.trim()) return entry.sourceName.trim();
  if (SOURCE_BY_SLUG[entry.sourceSlug]) return SOURCE_BY_SLUG[entry.sourceSlug];
  return kind === "fee" ? "DefiLlama Solana Fees" : "DefiLlama Solana TVL";
}

function protocolNameFromTopic(topic: TopicDetailView): string {
  const fromTitle = topic.title.split(":")[0]?.trim();
  if (fromTitle) return fromTitle;
  for (const entry of topic.timeline) {
    const name = entry.title.split(":")[0]?.trim();
    if (name) return name;
  }
  return "This protocol";
}

function titleSignalsFee(title: string): boolean {
  return /:\s*fees?\s+(up|down|[+-])/i.test(title) || /\bfees?\s+(up|down)\s+[\d,.]+%/i.test(title);
}

function titleSignalsTvl(title: string): boolean {
  return /:\s*TVL\s+(up|down|[+-])/i.test(title) || /\bTVL\s+(up|down)\s+[\d,.]+%/i.test(title);
}

function pickLatestEntry(
  entries: TopicTimelineEntry[],
  kind: TopicMetricSignalKind
): TopicTimelineEntry | undefined {
  const signalSet = kind === "fee" ? FEE_SIGNALS : TVL_SIGNALS;
  const matches = entries.filter(
    (e) =>
      (e.signal && signalSet.has(e.signal)) ||
      (kind === "fee" ? titleSignalsFee(e.title) : titleSignalsTvl(e.title))
  );
  if (matches.length === 0) return undefined;
  return [...matches].sort((a, b) => entryTimestamp(b) - entryTimestamp(a))[0];
}

function buildSignalRow(
  entry: TopicTimelineEntry,
  kind: TopicMetricSignalKind,
  topic: TopicDetailView
): TopicMetricSignalRow {
  const texts = [entry.title, topic.summary];
  for (const item of topic.evidence?.evidenceItems ?? []) {
    if (item.text?.includes(entry.title.slice(0, 20))) texts.push(item.text);
  }

  const fee = kind === "fee" ? parseFeeMetric(entry.title, texts.join(" ")) : null;
  const tvl = kind === "tvl" ? parseTvlMetric(entry.title, texts.join(" ")) : null;
  const move = fee ?? tvl;

  let currentValueLabel: string | undefined;
  for (const text of texts) {
    currentValueLabel = extractValueFromText(text, kind);
    if (currentValueLabel) break;
  }

  const changePctLabel = move
    ? `${move.direction === "down" ? "−" : "+"}${move.pct.toFixed(1)}% (24h)`
    : undefined;

  return {
    kind,
    label: kind === "fee" ? "Fee movement" : "TVL movement",
    title: entry.title,
    currentValueLabel,
    changePctLabel,
    sourceName: resolveSourceName(entry, kind),
    snapshotLabel: formatSnapshot(entry.publishedAt ?? entry.fetchedAt),
  };
}

export function detectTopicMetricSignalKinds(topic: TopicDetailView): TopicMetricSignalKind[] {
  const kinds: TopicMetricSignalKind[] = [];
  if (pickLatestEntry(topic.timeline, "fee")) kinds.push("fee");
  if (pickLatestEntry(topic.timeline, "tvl")) kinds.push("tvl");
  return kinds;
}

/** Primary metric kind implied by the canonical topic title. */
export function canonicalMetricKind(topic: TopicDetailView): TopicMetricSignalKind | null {
  if (titleSignalsFee(topic.title)) return "fee";
  if (titleSignalsTvl(topic.title)) return "tvl";
  return null;
}

export function hasMixedMetricSignals(topic: TopicDetailView): boolean {
  return detectTopicMetricSignalKinds(topic).length > 1;
}

export function buildTopicMixedMetrics(
  topic: TopicDetailView
): TopicMixedMetricsDisplay | null {
  const kinds = detectTopicMetricSignalKinds(topic);
  if (kinds.length < 2) return null;

  const protocolName = protocolNameFromTopic(topic);
  const signals: TopicMetricSignalRow[] = [];

  for (const kind of kinds) {
    const entry = pickLatestEntry(topic.timeline, kind);
    if (!entry) continue;
    signals.push(buildSignalRow(entry, kind, topic));
  }

  if (signals.length < 2) return null;

  return {
    protocolName,
    isMixed: true,
    signals,
    contextNote: `This topic groups related ${protocolName} metric signals detected in the same snapshot.`,
  };
}

export function mixedMetricBriefNote(topic: TopicDetailView): string | null {
  const mixed = buildTopicMixedMetrics(topic);
  if (!mixed) return null;

  const canonicalIsFee = titleSignalsFee(topic.title);
  const canonicalIsTvl = titleSignalsTvl(topic.title);

  if (canonicalIsFee && kindsIncludeTvl(topic)) {
    return `${mixed.contextNote} The page title reflects the primary fee signal; TVL movement is also included below.`;
  }

  if (canonicalIsTvl && kindsIncludeFee(topic)) {
    return `${mixed.contextNote} The page title reflects the primary TVL signal; fee movement is also included below.`;
  }

  return mixed.contextNote;
}

function kindsIncludeFee(topic: TopicDetailView): boolean {
  return detectTopicMetricSignalKinds(topic).includes("fee");
}

function kindsIncludeTvl(topic: TopicDetailView): boolean {
  return detectTopicMetricSignalKinds(topic).includes("tvl");
}

/** Resolve source label for a single metric evidence block by metric kind. */
export function resolveMetricSourceName(
  topic: TopicDetailView,
  kind: TopicMetricSignalKind
): string | undefined {
  const entry = pickLatestEntry(topic.timeline, kind);
  if (entry) return resolveSourceName(entry, kind);
  return kind === "fee" ? "DefiLlama Solana Fees" : "DefiLlama Solana TVL";
}

const NON_MIXED_CARD_KINDS = new Set([
  "single_editorial",
  "multi_editorial",
  "headline_only",
  "promoted_boost",
  "pump_style",
  "status_incident",
  "github_release",
]);

function cardHasFeeSignal(input: ReaderCopyInput): boolean {
  const signals = input.rankingSignals ?? [];
  if (signals.some((s) => FEE_SIGNALS.has(s))) return true;

  const slugs = input.sourceSlugs ?? [];
  if (slugs.includes("defillama-fees-solana")) return true;

  if (titleSignalsFee(input.title) || titleSignalsFee(input.summary ?? "")) return true;
  if (parseFeeMetric(input.title, input.summary)) return true;

  return (
    input.evidence?.evidenceItems?.some(
      (e) =>
        e.kind === "protocol_signal" &&
        (/fee|revenue/i.test(`${e.label} ${e.text}`) || /fees?\s+(up|down)/i.test(e.text))
    ) ?? false
  );
}

function cardHasTvlSignal(input: ReaderCopyInput): boolean {
  const signals = input.rankingSignals ?? [];
  if (signals.some((s) => TVL_SIGNALS.has(s))) return true;

  if (titleSignalsTvl(input.title) || titleSignalsTvl(input.summary ?? "")) return true;
  if (parseTvlMetric(input.title, input.summary)) return true;

  const slugs = input.sourceSlugs ?? [];
  const combined = `${input.title} ${input.summary ?? ""}`;
  if (slugs.includes("defillama-solana") && /\bTVL\b/i.test(combined)) return true;
  if (slugs.includes("defillama-solana") && slugs.includes("defillama-fees-solana")) {
    return true;
  }

  return (
    input.evidence?.evidenceItems?.some(
      (e) => e.kind === "protocol_signal" && /\bTVL\b/i.test(`${e.label} ${e.text}`)
    ) ?? false
  );
}

function isBoostOnlyCard(input: ReaderCopyInput): boolean {
  if (input.title.startsWith("DexScreener boost")) return true;
  const signals = input.rankingSignals ?? [];
  const slugs = input.sourceSlugs ?? [];
  const itemTypes = input.itemTypes ?? [];
  if (signals.length > 0 && signals.every((s) => s === "boost")) {
    const hasEditorial = itemTypes.some((t) => t === "news" || t === "manual");
    const hasEditorialSlug = slugs.some(
      (s) =>
        s === "solana-blog" ||
        s === "the-block-news" ||
        s === "decrypt-rss" ||
        s === "dlnews-rss"
    );
    return !hasEditorial && !hasEditorialSlug;
  }
  return false;
}

function isStatusOrGithubCard(input: ReaderCopyInput): boolean {
  const slugs = input.sourceSlugs ?? [];
  return (
    slugs.some((s) => STATUS_SOURCE_SLUGS.has(s) || GITHUB_RELEASE_SOURCE_SLUGS.has(s)) &&
    !slugs.some((s) => s.includes("defillama"))
  );
}

/** Card-safe mixed metric detection using homepage ranking fields only. */
export function detectCardMetricSignalKinds(input: ReaderCopyInput): TopicMetricSignalKind[] {
  const kinds: TopicMetricSignalKind[] = [];
  if (cardHasFeeSignal(input)) kinds.push("fee");
  if (cardHasTvlSignal(input)) kinds.push("tvl");
  return kinds;
}

export function hasMixedMetricSignalsOnCard(input: ReaderCopyInput): boolean {
  if (isBoostOnlyCard(input) || isStatusOrGithubCard(input)) return false;

  const kind = classifyReaderSignal(input);
  if (NON_MIXED_CARD_KINDS.has(kind)) return false;

  const kinds = detectCardMetricSignalKinds(input);
  if (kinds.length < 2) return false;

  const signals = input.rankingSignals ?? [];
  const slugs = input.sourceSlugs ?? [];
  const hasRankingProof =
    signals.some((s) => FEE_SIGNALS.has(s)) && signals.some((s) => TVL_SIGNALS.has(s));
  const hasSlugProof =
    slugs.includes("defillama-fees-solana") && slugs.includes("defillama-solana");
  const hasTextProof = Boolean(
    (titleSignalsFee(input.title) || parseFeeMetric(input.title, input.summary)) &&
      (titleSignalsTvl(input.title) ||
        titleSignalsTvl(input.summary ?? "") ||
        parseTvlMetric(input.title, input.summary))
  );

  return hasRankingProof || hasSlugProof || hasTextProof;
}

export function buildHomepageMixedMetricHint(input: ReaderCopyInput): string | null {
  if (!hasMixedMetricSignalsOnCard(input)) return null;
  const kinds = detectCardMetricSignalKinds(input);
  const labels = kinds.map((k) => (k === "fee" ? "fees" : "TVL")).join(" + ");
  return `Grouped metric signals: ${labels}`;
}
