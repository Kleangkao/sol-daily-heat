import type { TopicDetailView } from "@/lib/types/topic-detail";
import { isGenericRiskNote } from "@/lib/heat/risk-note";
import {
  buildReaderDisplayCopy,
  classifyReaderSignal,
  parseFeeMetric,
  readerCopyInputFromTopic,
  type ReaderSignalKind,
} from "@/lib/heat/reader-signal-copy";
import {
  canonicalMetricKind,
  mixedMetricBriefNote,
} from "@/lib/heat/topic-mixed-metrics";

export type TopicNarrativeBrief = {
  mode: "signal_brief" | "narrative_brief";
  heading: "Signal brief" | "Brief";
  paragraphs: string[];
  watchNext: string[];
  caution?: string;
  confidenceNote?: string;
};

function isSignalBriefKind(kind: ReaderSignalKind): boolean {
  return (
    kind === "metric_fee" ||
    kind === "metric_tvl" ||
    kind === "promoted_boost" ||
    kind === "pump_style" ||
    kind === "headline_only"
  );
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

function uniqueBullets(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

function splitWatchText(text: string): string[] {
  return text
    .split(/\n|(?<=[.!?])\s+/)
    .map((s) => s.trim().replace(/^[-•]\s*/, ""))
    .filter((s) => s.length > 12);
}

function metricFeeParagraphs(topic: TopicDetailView): string[] {
  const input = readerCopyInputFromTopic(topic);
  const fee = parseFeeMetric(topic.title, topic.summary);
  const amount = extractFeeAmount(
    topic.summary,
    topic.evidence?.whatHappened,
    topic.title
  );
  const whatChanged = (() => {
    if (fee?.protocol && amount) {
      const dir = fee.direction === "up" ? "rose" : "fell";
      return `${fee.protocol} 24h fees ${dir} to about $${amount.replace(/^\$/, "")} in the latest DefiLlama snapshot.`;
    }
    if (fee?.protocol) {
      return `${fee.protocol} registered an unusual 24h fee move in the latest protocol snapshot.`;
    }
    const name = topic.title.split(":")[0]?.trim() || "This protocol";
    return `${name} showed a sharp fee move in the last 24h window.`;
  })();

  return [
    whatChanged,
    "The scanner flagged it after the move crossed its fee-activity threshold — a protocol metric signal, not editorial confirmation.",
    "Sudden fee spikes can reflect incentives, routing changes, or thin baselines. See evidence below for raw values; this is not a full news article.",
  ];
}

function metricTvlParagraphs(topic: TopicDetailView): string[] {
  const name = topic.title.split(":")[0]?.trim() || "This protocol";
  return [
    `${name} registered a notable TVL change in the last 24h according to ingested protocol data.`,
    "The scanner surfaced it as a protocol-activity signal when the move crossed its TVL threshold.",
    "TVL alone does not confirm narrative momentum — check drivers and corroborating usage in evidence.",
  ];
}

function marketSignalParagraphs(topic: TopicDetailView, kind: ReaderSignalKind): string[] {
  const token = topic.title.replace(/^DexScreener boost:\s*/i, "").trim();
  if (kind === "pump_style") {
    return [
      `Early market visibility appeared for ${token || "this mint"} through DexScreener-style discovery feeds.`,
      "The scanner treats paid or thin-liquidity visibility as a market-discovery signal only.",
      "Promotion and pump-style mints are high risk — verify liquidity, holders, and independent coverage before acting.",
    ];
  }
  return [
    `DexScreener paid visibility surfaced ${token || "this token"} on today's scanner tape.`,
    "The scanner records this as market discovery — increased discoverability, not fundamental validation.",
    "Paid boosts do not confirm project quality. Treat as a watchlist item, not a recommendation.",
  ];
}

function headlineOnlyParagraphs(topic: TopicDetailView): string[] {
  return [
    `SolanaFloor headline discovery: "${topic.title.slice(0, 140)}".`,
    "The scanner captured the headline for early discovery; full article text was not ingested.",
    "Open the source link and look for primary-source confirmation before treating this as established news.",
  ];
}

function defaultMetricWatchNext(): string[] {
  return [
    "Watch whether the metric stays elevated over the next 24–48h.",
    "Check if TVL, usage, or on-chain activity corroborates the move.",
    "See whether independent sources mention the same protocol activity.",
  ];
}

function defaultMarketWatchNext(): string[] {
  return [
    "Watch liquidity depth and holder concentration over the next day.",
    "Look for independent coverage or on-chain usage beyond paid visibility.",
    "See whether the token reappears outside boost-only discovery feeds.",
  ];
}

function defaultEditorialWatchNext(topic: TopicDetailView): string[] {
  const bullets = topic.evidence?.watchNext
    ? splitWatchText(topic.evidence.watchNext)
    : [];
  if (bullets.length > 0) return bullets;
  return [
    "Watch for follow-up reporting or official announcements on the same story.",
    "Check whether on-chain or ecosystem signals align with the coverage.",
  ];
}

function narrativeParagraphs(
  topic: TopicDetailView,
  kind: ReaderSignalKind
): string[] {
  const stored = topic.summary?.trim();
  const whatHappened =
    stored && stored.length > 40 && !/adapter signal|fees move/i.test(stored)
      ? stored
      : topic.evidence?.whatHappened?.trim() || topic.title;

  if (kind === "multi_editorial") {
    return [
      whatHappened,
      `Multiple sources are covering "${topic.title.slice(0, 120)}" today, which increases narrative visibility in the scanner.`,
      "Cross-source repetition suggests an ecosystem story worth tracking — still verify primary sources and on-chain context.",
    ];
  }

  if (kind === "single_editorial") {
    return [
      whatHappened,
      "This is early editorial coverage from a single source. The scanner treats it as a narrative signal, not confirmed momentum.",
      "Follow-up reporting, official posts, or on-chain evidence would strengthen confidence in the story.",
    ];
  }

  if (kind === "status_incident") {
    return [
      whatHappened,
      "Operational status changes can affect builders and users quickly.",
      "Confirm current resolution and impact on the official status page linked in evidence.",
    ];
  }

  if (kind === "github_release") {
    return [
      whatHappened,
      "Release activity can shift builder attention when it touches performance, tooling, or client behavior.",
      "See release notes in evidence for version scope and deployment implications.",
    ];
  }

  return [
    whatHappened,
    "The scanner clustered related signals for today's UTC snapshot.",
    "Use evidence and source links below to verify before acting on this context.",
  ];
}

function buildConfidenceNote(
  topic: TopicDetailView,
  kind: ReaderSignalKind
): string | undefined {
  if (topic.headlineOnlySources) {
    return "Headline-only discovery — article body was not ingested. Open source links to verify.";
  }
  if (
    (kind === "metric_fee" || kind === "metric_tvl") &&
    topic.uniqueSourceCount <= 1
  ) {
    return "This is a metric signal, not confirmed narrative momentum.";
  }
  if (kind === "single_editorial") {
    return "Early coverage from one source — follow-up reporting would strengthen confidence.";
  }
  if (kind === "promoted_boost" || kind === "pump_style") {
    return "Market-discovery signal only — not validation or investment advice.";
  }
  return undefined;
}

function buildCaution(
  topic: TopicDetailView,
  readerPctCaution?: string
): string | undefined {
  const parts: string[] = [];
  if (readerPctCaution) parts.push(readerPctCaution);
  if (!isGenericRiskNote(topic.riskNote)) parts.push(topic.riskNote);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export function buildTopicNarrativeBrief(topic: TopicDetailView): TopicNarrativeBrief {
  const input = readerCopyInputFromTopic(topic);
  const kind = classifyReaderSignal(input);
  const readerCopy = buildReaderDisplayCopy(input);
  const signalBrief = isSignalBriefKind(kind);

  let paragraphs: string[];
  let watchNext: string[];

  const mixedNote = mixedMetricBriefNote(topic);
  const canonicalMetric = canonicalMetricKind(topic);
  const metricParagraphKind =
    canonicalMetric ?? (kind === "metric_tvl" ? "tvl" : kind === "metric_fee" ? "fee" : null);

  if (metricParagraphKind === "fee") {
    paragraphs = metricFeeParagraphs(topic);
    watchNext = defaultMetricWatchNext();
  } else if (metricParagraphKind === "tvl") {
    paragraphs = metricTvlParagraphs(topic);
    watchNext = defaultMetricWatchNext();
  } else if (kind === "metric_fee") {
    paragraphs = metricFeeParagraphs(topic);
    watchNext = defaultMetricWatchNext();
  } else if (kind === "metric_tvl") {
    paragraphs = metricTvlParagraphs(topic);
    watchNext = defaultMetricWatchNext();
  } else if (kind === "promoted_boost" || kind === "pump_style") {
    paragraphs = marketSignalParagraphs(topic, kind);
    watchNext = defaultMarketWatchNext();
  } else if (kind === "headline_only") {
    paragraphs = headlineOnlyParagraphs(topic);
    watchNext = [
      "Open the source article for full context.",
      "Watch for follow-up coverage from primary or official sources.",
    ];
  } else {
    paragraphs = narrativeParagraphs(topic, kind);
    watchNext = defaultEditorialWatchNext(topic);
  }

  const evidenceWatch = topic.evidence?.watchNext
    ? splitWatchText(topic.evidence.watchNext)
    : [];
  if (evidenceWatch.length > 0 && kind !== "metric_fee" && kind !== "metric_tvl") {
    watchNext = uniqueBullets([...watchNext, ...evidenceWatch]);
  } else if (evidenceWatch.length > 0 && kind === "metric_fee") {
    const tvlLine = evidenceWatch.find((w) => /tvl|governance|audit/i.test(w));
    if (tvlLine) {
      watchNext = uniqueBullets([...watchNext, tvlLine]);
    }
  }

  if (mixedNote) {
    paragraphs = [mixedNote, ...paragraphs];
  }

  return {
    mode: signalBrief ? "signal_brief" : "narrative_brief",
    heading: signalBrief ? "Signal brief" : "Brief",
    paragraphs,
    watchNext: uniqueBullets(watchNext),
    caution: buildCaution(topic, readerCopy.pctCaution),
    confidenceNote: buildConfidenceNote(topic, kind),
  };
}
