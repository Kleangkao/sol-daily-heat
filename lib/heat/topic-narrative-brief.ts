import { stripEmDash } from "@/lib/heat/copy-format";
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
  const fee = parseFeeMetric(topic.title, topic.summary);
  const name =
    fee?.protocol ?? topic.title.split(":")[0]?.trim() ?? "This protocol";
  return [
    `${name} crossed the scanner fee-activity threshold in the latest DefiLlama snapshot.`,
    "Metric signal, not a full news article. Sourced values are in the evidence table below.",
  ];
}

function metricTvlParagraphs(topic: TopicDetailView): string[] {
  const name = topic.title.split(":")[0]?.trim() || "This protocol";
  return [
    `${name} crossed the scanner TVL threshold in the latest protocol snapshot.`,
    "Metric signal, not a full news article. Sourced values are in the evidence table below.",
  ];
}

function marketSignalParagraphs(topic: TopicDetailView, kind: ReaderSignalKind): string[] {
  const token = topic.title.replace(/^DexScreener boost:\s*/i, "").trim();
  if (kind === "pump_style") {
    return [
      `Early market visibility appeared for ${token || "this mint"} through DexScreener-style discovery feeds.`,
      "The scanner treats paid or thin-liquidity visibility as a market-discovery signal only.",
      "Promotion and pump-style mints are high risk. Verify liquidity, holders, and independent coverage before acting.",
    ];
  }
  return [
    `DexScreener paid visibility surfaced ${token || "this token"} on today's scanner tape.`,
    "The scanner records this as market discovery. Increased discoverability, not fundamental validation.",
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
      "Cross-source repetition suggests an ecosystem story worth tracking. Still verify primary sources and on-chain context.",
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
    return "Headline-only discovery. Article body was not ingested. Open source links to verify.";
  }
  if (kind === "metric_fee" || kind === "metric_tvl") {
    return undefined;
  }
  if (kind === "single_editorial") {
    return "Early coverage from one source. Follow-up reporting would strengthen confidence.";
  }
  if (kind === "promoted_boost" || kind === "pump_style") {
    return "Market-discovery signal only. Not validation or investment advice.";
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
    watchNext = [];
  } else if (metricParagraphKind === "tvl") {
    paragraphs = metricTvlParagraphs(topic);
    watchNext = [];
  } else if (kind === "metric_fee") {
    paragraphs = metricFeeParagraphs(topic);
    watchNext = [];
  } else if (kind === "metric_tvl") {
    paragraphs = metricTvlParagraphs(topic);
    watchNext = [];
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

  const isMetricTopic =
    metricParagraphKind === "fee" ||
    metricParagraphKind === "tvl" ||
    kind === "metric_fee" ||
    kind === "metric_tvl";
  const evidenceWatch = topic.evidence?.watchNext
    ? splitWatchText(topic.evidence.watchNext)
    : [];
  if (evidenceWatch.length > 0 && !isMetricTopic) {
    watchNext = uniqueBullets([...watchNext, ...evidenceWatch]);
  }

  if (mixedNote) {
    paragraphs = [mixedNote, ...paragraphs];
  }

  const caution = buildCaution(topic, readerCopy.pctCaution);
  const confidenceNote = buildConfidenceNote(topic, kind);

  return {
    mode: signalBrief ? "signal_brief" : "narrative_brief",
    heading: signalBrief ? "Signal brief" : "Brief",
    paragraphs: paragraphs.map(stripEmDash),
    watchNext: uniqueBullets(watchNext).map(stripEmDash),
    caution: caution ? stripEmDash(caution) : undefined,
    confidenceNote: confidenceNote ? stripEmDash(confidenceNote) : undefined,
  };
}
