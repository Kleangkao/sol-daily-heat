import type { TopicDetailView, TopicTimelineEntry } from "@/lib/types/topic-detail";
import { parseFeeMetric, parseTvlMetric } from "@/lib/heat/reader-signal-copy";

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
  "defillama-fees-solana": "DefiLlama — Solana Fees",
  "defillama-solana": "DefiLlama — Solana TVL",
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
  return kind === "fee" ? "DefiLlama — Solana Fees" : "DefiLlama — Solana TVL";
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
  return kind === "fee" ? "DefiLlama — Solana Fees" : "DefiLlama — Solana TVL";
}
