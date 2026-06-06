import type { TopicDetailView } from "@/lib/types/topic-detail";
import {
  classifyReaderSignal,
  parseFeeMetric,
  readerCopyInputFromTopic,
  type ReaderSignalKind,
} from "@/lib/heat/reader-signal-copy";
import {
  canonicalMetricKind,
  resolveMetricSourceName,
  type TopicMetricSignalKind,
} from "@/lib/heat/topic-mixed-metrics";

export type MetricEvidenceDepth = "single_source" | "multi_source" | "unknown";

export type TopicMetricEvidence = {
  metricLabel: string;
  currentValueLabel?: string;
  previousValueLabel?: string;
  changePctLabel?: string;
  sourceName?: string;
  snapshotLabel?: string;
  evidenceDepth: MetricEvidenceDepth;
  derivedFields?: string[];
  limitations?: string[];
};

export type TopicMetricEvidenceDisplay = {
  evidence: TopicMetricEvidence;
  confirmedFacts: string[];
  possibleInterpretations: string[];
  needsConfirmation: string[];
};

type ParsedMetricMove = {
  kind: "fee" | "tvl";
  metricLabel: string;
  direction: "up" | "down";
  pct: number;
};

function isMetricEvidenceKind(kind: ReaderSignalKind): boolean {
  return kind === "metric_fee" || kind === "metric_tvl";
}

function parsePct(raw: string): number | null {
  const pct = parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(pct) ? pct : null;
}

function parseTvlMetric(title: string, summary?: string): ParsedMetricMove | null {
  const patterns: Array<{
    re: RegExp;
    protocol?: number;
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

  for (const pattern of patterns) {
    const m = title.match(pattern.re);
    if (!m) continue;
    const pct = parsePct(m[pattern.pct]);
    if (pct == null) continue;
    const direction =
      pattern.dir != null
        ? m[pattern.dir].toLowerCase() === "down"
          ? "down"
          : "up"
        : m[pattern.sign!] === "-"
          ? "down"
          : "up";
    return { kind: "tvl", metricLabel: "24h TVL", direction, pct };
  }

  for (const text of [summary, title].filter(Boolean)) {
    const m = text!.match(/TVL\s+(up|down)\s+([\d,.]+)%/i);
    if (m) {
      const pct = parsePct(m[2]);
      if (pct != null) {
        return {
          kind: "tvl",
          metricLabel: "24h TVL",
          direction: m[1].toLowerCase() === "down" ? "down" : "up",
          pct,
        };
      }
    }
  }

  return null;
}

function parseMetricMove(
  topic: TopicDetailView,
  primaryKind: TopicMetricSignalKind
): ParsedMetricMove | null {
  if (primaryKind === "fee") {
    const fee = parseFeeMetric(topic.title, topic.summary);
    if (fee) {
      return {
        kind: "fee",
        metricLabel: "24h fees",
        direction: fee.direction,
        pct: fee.pct,
      };
    }
    return null;
  }
  const tvl = parseTvlMetric(topic.title, topic.summary);
  if (tvl) {
    return {
      kind: "tvl",
      metricLabel: "24h TVL",
      direction: tvl.direction,
      pct: tvl.pct,
    };
  }
  return null;
}

function collectEvidenceTexts(topic: TopicDetailView): string[] {
  const texts: string[] = [];
  if (topic.summary?.trim()) texts.push(topic.summary.trim());
  if (topic.evidence?.whatHappened?.trim()) texts.push(topic.evidence.whatHappened.trim());
  for (const item of topic.evidence?.evidenceItems ?? []) {
    if (item.text?.trim()) texts.push(item.text.trim());
  }
  for (const entry of topic.timeline) {
    if (entry.title?.trim()) texts.push(entry.title.trim());
  }
  return texts;
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

function extractCurrentValue(
  texts: string[],
  kind: "fee" | "tvl"
): { label: string; amount: number } | null {
  const patterns =
    kind === "fee"
      ? [/24h fees\s*~?\s*\$?([\d,.]+[KMB]?)/i, /fees\s*~?\s*\$?([\d,.]+[KMB]?)/i]
      : [/TVL\s*~?\s*\$?([\d,.]+[KMB]?)/i, /24h TVL\s*~?\s*\$?([\d,.]+[KMB]?)/i];

  for (const text of texts) {
    for (const re of patterns) {
      const m = text.match(re);
      if (!m) continue;
      const amount = parseUsdToken(m[1]);
      if (amount != null) {
        return { label: formatUsdLabel(amount), amount };
      }
    }
  }
  return null;
}

function derivePreviousLabel(
  current: number,
  move: ParsedMetricMove
): { label: string; derived: boolean } | null {
  const divisor = move.direction === "up" ? 1 + move.pct / 100 : 1 - move.pct / 100;
  if (divisor <= 0 || !Number.isFinite(divisor)) return null;
  const previous = current / divisor;
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return {
    label: `${formatUsdLabel(previous)} (derived from reported % change)`,
    derived: true,
  };
}

function formatChangeLabel(move: ParsedMetricMove): string {
  const sign = move.direction === "down" ? "−" : "+";
  return `${sign}${move.pct.toFixed(1)}% (24h)`;
}

function resolveSourceName(
  topic: TopicDetailView,
  metricKind: TopicMetricSignalKind
): string | undefined {
  return resolveMetricSourceName(topic, metricKind);
}

function resolveSnapshotLabel(topic: TopicDetailView): string | undefined {
  const primary = topic.timeline.find((t) => t.isPrimary) ?? topic.timeline[0];
  const iso = primary?.publishedAt ?? primary?.fetchedAt ?? topic.storyAt;
  if (!iso) return topic.rankingDate ? `UTC snapshot ${topic.rankingDate}` : undefined;
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

function resolveEvidenceDepth(topic: TopicDetailView): MetricEvidenceDepth {
  if (topic.uniqueSourceCount > 1) return "multi_source";
  if (topic.uniqueSourceCount === 1) return "single_source";
  return "unknown";
}

function buildLimitations(
  topic: TopicDetailView,
  move: ParsedMetricMove | null,
  derivedFields: string[]
): string[] {
  const limitations: string[] = [
    "Not enough stored history yet for 7d / 30d averages.",
  ];
  const smallBase = (topic.scoreBreakdown?.fee_small_base_discount ?? 0) < 0;
  if (move && (move.pct > 200 || smallBase)) {
    limitations.push("Large % moves can be exaggerated when the previous baseline was low.");
  }
  if (derivedFields.includes("previousValueLabel")) {
    limitations.push("Previous value is approximated from current value and % change — not directly sourced.");
  }
  return limitations;
}

function buildConfirmedFacts(
  evidence: TopicMetricEvidence,
  kind: ReaderSignalKind
): string[] {
  const facts: string[] = [];
  if (evidence.currentValueLabel) {
    facts.push(`Current ${evidence.metricLabel.toLowerCase()}: ${evidence.currentValueLabel}`);
  }
  if (evidence.changePctLabel) {
    facts.push(`Reported change: ${evidence.changePctLabel}`);
  }
  if (evidence.sourceName) {
    facts.push(`Source: ${evidence.sourceName}`);
  }
  if (evidence.evidenceDepth === "single_source") {
    facts.push("Single-source metric signal from ingested protocol data.");
  } else if (evidence.evidenceDepth === "multi_source") {
    facts.push("Multiple sources contributed to this metric cluster.");
  }
  if (kind === "metric_fee" || kind === "metric_tvl") {
    facts.push("Scanner flagged a protocol-activity threshold — not editorial confirmation.");
  }
  return facts;
}

const POSSIBLE_INTERPRETATIONS = [
  "Real protocol usage increase",
  "Incentives or routing changes",
  "One-off event or reporting noise",
  "Low baseline exaggerating the % move",
];

const NEEDS_CONFIRMATION = [
  "TVL trend over the next 24–48h",
  "Trading volume or swap activity",
  "Active users / transactions (if surfaced in follow-up sources)",
  "Independent sources covering the same protocol activity",
  "Official protocol announcements or governance updates",
];

export function buildTopicMetricEvidence(
  topic: TopicDetailView
): TopicMetricEvidenceDisplay | null {
  const input = readerCopyInputFromTopic(topic);
  const kind = classifyReaderSignal(input);
  if (!isMetricEvidenceKind(kind)) return null;

  const metricKind =
    canonicalMetricKind(topic) ?? (kind === "metric_tvl" ? "tvl" : "fee");
  const move = parseMetricMove(topic, metricKind);
  const texts = collectEvidenceTexts(topic);
  const current = extractCurrentValue(texts, metricKind);

  const derivedFields: string[] = [];
  let previousValueLabel: string | undefined;

  if (current && move) {
    const derived = derivePreviousLabel(current.amount, move);
    if (derived) {
      previousValueLabel = `Previous ${move.metricLabel.toLowerCase()}: ${derived.label}`;
      if (derived.derived) derivedFields.push("previousValueLabel");
    }
  }

  const evidence: TopicMetricEvidence = {
    metricLabel: move?.metricLabel ?? (metricKind === "tvl" ? "24h TVL" : "24h fees"),
    currentValueLabel: current?.label,
    previousValueLabel,
    changePctLabel: move ? formatChangeLabel(move) : undefined,
    sourceName: resolveSourceName(topic, metricKind),
    snapshotLabel: resolveSnapshotLabel(topic),
    evidenceDepth: resolveEvidenceDepth(topic),
    derivedFields: derivedFields.length > 0 ? derivedFields : undefined,
    limitations: buildLimitations(topic, move, derivedFields),
  };

  return {
    evidence,
    confirmedFacts: buildConfirmedFacts(evidence, kind),
    possibleInterpretations: POSSIBLE_INTERPRETATIONS,
    needsConfirmation: NEEDS_CONFIRMATION,
  };
}
