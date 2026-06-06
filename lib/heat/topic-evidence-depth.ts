import { hasOfficialSource } from "@/lib/scoring/official-sources";
import { GITHUB_RELEASE_SOURCE_SLUGS, STATUS_SOURCE_SLUGS } from "@/lib/sources/rss-ingest-policy";
import {
  classifyReaderSignal,
  readerCopyInputFromTopic,
  type ReaderSignalKind,
} from "@/lib/heat/reader-signal-copy";
import type { TopicDetailView, TopicTimelineEntry } from "@/lib/types/topic-detail";
import { normalizeCopyText } from "@/lib/heat/topic-copy-layers";

export type TopicEvidenceDepthKind =
  | "primary_source"
  | "single_editorial"
  | "multi_source"
  | "metric_only"
  | "headline_only"
  | "market_discovery"
  | "status_source"
  | "github_release";

export type TopicEvidenceDepth = {
  kind: TopicEvidenceDepthKind;
  label: string;
  confidenceNote: string;
  sourceLabel?: string;
};

function sourceSlugs(topic: TopicDetailView): string[] {
  return Array.from(new Set(topic.timeline.map((t) => t.sourceSlug)));
}

function primaryTimelineSource(topic: TopicDetailView): string | undefined {
  const primary = topic.timeline.find((t) => t.isPrimary) ?? topic.timeline[0];
  return primary?.sourceName;
}

export function resolveTopicEvidenceDepth(topic: TopicDetailView): TopicEvidenceDepth {
  const input = readerCopyInputFromTopic(topic);
  const kind = classifyReaderSignal(input);
  const slugs = sourceSlugs(topic);
  const official = hasOfficialSource(slugs);
  const uniqueSources = topic.uniqueSourceCount;
  const sourceLabel = primaryTimelineSource(topic);

  if (kind === "headline_only" || topic.headlineOnlySources) {
    return {
      kind: "headline_only",
      label: "Headline-only discovery",
      confidenceNote:
        "Headline ingested; full article body was not stored. Open the source link for the full text.",
      sourceLabel,
    };
  }

  if (kind === "github_release" || slugs.some((s) => GITHUB_RELEASE_SOURCE_SLUGS.has(s))) {
    return {
      kind: "github_release",
      label: "GitHub release",
      confidenceNote: "Release notes from the linked repository.",
      sourceLabel,
    };
  }

  if (kind === "status_incident" || slugs.some((s) => STATUS_SOURCE_SLUGS.has(s))) {
    return {
      kind: "status_source",
      label: "Status source",
      confidenceNote: "Status update from the linked status feed.",
      sourceLabel,
    };
  }

  if (kind === "metric_fee" || kind === "metric_tvl") {
    return {
      kind: "metric_only",
      label: "Metric-only signal",
      confidenceNote: "Protocol metric from the linked adapter source.",
      sourceLabel,
    };
  }

  if (kind === "promoted_boost" || kind === "pump_style") {
    return {
      kind: "market_discovery",
      label: "Market-discovery signal",
      confidenceNote: "Market visibility from the linked discovery feed.",
      sourceLabel,
    };
  }

  if (kind === "multi_editorial" || uniqueSources > 1) {
    return {
      kind: "multi_source",
      label: "Multi-source coverage",
      confidenceNote: `${uniqueSources} source${uniqueSources !== 1 ? "s" : ""} linked in this cluster.`,
      sourceLabel,
    };
  }

  if (official) {
    return {
      kind: "primary_source",
      label: "Primary source",
      confidenceNote: "Official project publication linked below.",
      sourceLabel,
    };
  }

  if (kind === "single_editorial") {
    return {
      kind: "single_editorial",
      label: "Single editorial source",
      confidenceNote: "One editorial source linked in this cluster.",
      sourceLabel,
    };
  }

  return {
    kind: "single_editorial",
    label: "Single source",
    confidenceNote: "One source linked in this cluster.",
    sourceLabel,
  };
}

function splitStatusUpdateText(text: string): string[] {
  const parts = text
    .split(/\n{2,}|\r?\n(?=[•*\-]|[\d]{1,2}\/[\d]{1,2}\/|[A-Z][a-z]{2,}\s+\d)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 24);
  if (parts.length >= 2) return parts;
  return [];
}

function syntheticStatusEntries(topic: TopicDetailView): TopicTimelineEntry[] {
  const base = topic.timeline[0];
  const evidenceTexts = (topic.evidence?.evidenceItems ?? [])
    .map((e) => e.text.trim())
    .filter((t) => t.length > 20);

  const uniqueTexts = Array.from(
    new Map(evidenceTexts.map((t) => [normalizeCopyText(t), t])).values()
  );

  let chunks: string[] = uniqueTexts;
  if (chunks.length < 2 && base?.title) {
    const fromSnippet = splitStatusUpdateText(
      topic.evidence?.whatHappened ?? base.title
    );
    if (fromSnippet.length >= 2) chunks = fromSnippet;
  }

  if (chunks.length < 2) return [];

  return chunks.map((text, i) => ({
    id: `status-update-${i}`,
    sourceName: base?.sourceName ?? "Status",
    sourceSlug: base?.sourceSlug ?? "solana-status",
    title: text.slice(0, 160),
    url: base?.url ?? null,
    publishedAt: base?.publishedAt ?? null,
    fetchedAt: base?.fetchedAt ?? topic.lastUpdatedAt,
    itemType: base?.itemType ?? "news",
    signal: base?.signal ?? "status",
    headlineOnly: false,
    isPrimary: i === 0,
  }));
}

/** Timeline entries for display (may synthesize status update rows). */
export function resolveTopicTimelineEntries(topic: TopicDetailView): TopicTimelineEntry[] {
  if (topic.timeline.length >= 2) return topic.timeline;

  const input = readerCopyInputFromTopic(topic);
  const kind = classifyReaderSignal(input);
  if (kind === "status_incident") {
    const synthetic = syntheticStatusEntries(topic);
    if (synthetic.length >= 2) return synthetic;
  }

  return topic.timeline;
}

/** Timeline adds value when multiple sources/events (or status updates) exist. */
export function shouldShowTopicTimeline(topic: TopicDetailView): boolean {
  return resolveTopicTimelineEntries(topic).length >= 2;
}

export function relevantPersonaRoles(kind: ReaderSignalKind): Array<"creator" | "investor" | "builder"> {
  switch (kind) {
    case "github_release":
      return ["builder"];
    case "metric_fee":
    case "metric_tvl":
      return ["investor"];
    case "promoted_boost":
    case "pump_style":
      return ["investor", "creator"];
    case "status_incident":
      return ["builder", "investor"];
    case "multi_editorial":
    case "single_editorial":
    case "headline_only":
      return ["creator", "investor"];
    default:
      return ["creator", "investor", "builder"];
  }
}
