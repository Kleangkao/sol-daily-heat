import {
  classifyReaderSignal,
  readerCopyInputFromCard,
  type ReaderCopyInput,
  type ReaderSignalKind,
} from "@/lib/heat/reader-signal-copy";
import type { HeatCardView } from "@/lib/types/heat";
import type { TopicDetailView } from "@/lib/types/topic-detail";

export type PersonaRole = "creator" | "investor" | "builder";

const TEMPLATE_PATTERNS = [
  /^Creator angle \([^)]+\): Break down "/i,
  /^Watchlist context: Monitor "/i,
  /^Builder context: this topic appears in Builder/i,
  /^Builder context: monitor infra/i,
];

export function isTemplatedPersonaNote(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return TEMPLATE_PATTERNS.some((re) => re.test(text.trim()));
}

function creatorCopy(kind: ReaderSignalKind): string {
  switch (kind) {
    case "metric_fee":
    case "metric_tvl":
      return "Explain the fee or TVL spike as a signal, show the raw metric, and warn that low baselines can exaggerate % moves.";
    case "single_editorial":
    case "multi_editorial":
    case "headline_only":
      return "Turn this into a narrative thread or short explainer about why the ecosystem update matters.";
    case "github_release":
      return "Frame this around developer impact, reliability, or infrastructure changes.";
    case "status_incident":
      return "Frame this around developer impact, reliability, or infrastructure changes.";
    case "promoted_boost":
    case "pump_style":
      return "Frame this as market-discovery/risk context, not alpha.";
    default:
      return "Turn this into a concise explainer with primary-source links — avoid price calls.";
  }
}

function investorCopy(kind: ReaderSignalKind): string {
  switch (kind) {
    case "metric_fee":
    case "metric_tvl":
      return "Watch whether fees or TVL stay elevated and whether TVL, volume, or other sources confirm the move.";
    case "single_editorial":
    case "multi_editorial":
    case "headline_only":
      return "Watch for adoption, integrations, follow-up announcements, or on-chain confirmation.";
    case "github_release":
    case "status_incident":
      return "Watch for integration risk, ecosystem dependency, or operational impact.";
    case "promoted_boost":
    case "pump_style":
      return "Do not treat paid visibility as validation; check liquidity, source quality, and risk labels first.";
    default:
      return "Monitor for follow-through signals and primary-source confirmation — not a buy/sell signal.";
  }
}

function builderCopy(kind: ReaderSignalKind): string {
  switch (kind) {
    case "github_release":
      return "Check release notes, compatibility, validator/client impact, and downstream tooling changes.";
    case "status_incident":
      return "Monitor service status, resolution timeline, and any builder-facing dependencies affected.";
    case "metric_fee":
    case "metric_tvl":
      return "Use as protocol-activity context; corroborate with usage data before assuming sustained change.";
    default:
      return "Monitor infrastructure, tooling, or operational impact from this topic.";
  }
}

function resolveDisplayCopy(role: PersonaRole, kind: ReaderSignalKind): string {
  if (role === "creator") return creatorCopy(kind);
  if (role === "investor") return investorCopy(kind);
  return builderCopy(kind);
}

export function buildPersonaDisplayNote(
  role: PersonaRole,
  input: ReaderCopyInput,
  stored?: string | null
): string | null {
  const kind = classifyReaderSignal(input);
  const display = resolveDisplayCopy(role, kind);
  if (!stored?.trim()) return display;
  if (isTemplatedPersonaNote(stored)) return display;
  return stored.trim();
}

export function personaInputFromTopic(topic: TopicDetailView): ReaderCopyInput {
  return {
    title: topic.title,
    summary: topic.summary,
    whyHot: topic.whyHot,
    scoreBreakdown: topic.scoreBreakdown,
    evidence: topic.evidence ?? undefined,
    interpretationType: topic.interpretationType,
    sourceSlugs: Array.from(new Set(topic.timeline.map((t) => t.sourceSlug))),
    itemTypes: Array.from(new Set(topic.timeline.map((t) => t.itemType))),
    rankingSignals: Array.from(
      new Set(topic.timeline.map((t) => t.signal).filter((s): s is string => Boolean(s)))
    ),
    sourceCount: topic.uniqueSourceCount,
    headlineOnly: topic.headlineOnlySources,
    category: topic.category,
  };
}

export function buildCardPersonaDisplay(
  role: PersonaRole,
  card: HeatCardView
): string | null {
  const stored =
    role === "creator"
      ? card.creatorAngle
      : role === "investor"
        ? card.investorWatchline
        : undefined;
  if (role !== "builder" && !stored) return null;
  return buildPersonaDisplayNote(role, readerCopyInputFromCard(card), stored ?? null);
}
