import Link from "next/link";
import type { TopicDetailView } from "@/lib/types/topic-detail";
import type { EvidenceItem, EvidenceKind } from "@/lib/types/evidence";
import { CATEGORY_LABELS } from "@/lib/types/heat";
import { canLinkTokenDetail, tokenDetailPath } from "@/lib/heat/token-link";
import HeatScoreBadge from "@/components/heat/HeatScoreBadge";
import ScoreBreakdown from "@/components/heat/ScoreBreakdown";
import { explainScoreBreakdown } from "@/lib/heat/score-breakdown-explainer";
import { buildTopicNarrativeBrief } from "@/lib/heat/topic-narrative-brief";
import { buildHeatScoreContext } from "@/lib/heat/heat-score-context";
import {
  buildTopicMetricEvidence,
  type TopicMetricEvidence,
} from "@/lib/heat/topic-metric-evidence";
import { buildTopicMixedMetrics } from "@/lib/heat/topic-mixed-metrics";
import {
  buildPersonaDisplayNote,
  personaInputFromTopic,
} from "@/lib/heat/persona-display-copy";
import { formatStoryTimestampLine } from "@/lib/heat/story-timestamp";
type DisplayEvidenceKind = EvidenceKind | "status_incident";

function MetricEvidenceRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 gap-y-0.5 text-[13px] sm:grid-cols-[minmax(0,8.5rem)_1fr]">
      <span className="font-semibold text-text-muted">{label}</span>
      <span className={muted ? "text-text-muted" : "text-text-primary"}>{value}</span>
    </div>
  );
}

function evidenceDepthLabel(depth: TopicMetricEvidence["evidenceDepth"]): string {
  switch (depth) {
    case "single_source":
      return "Single source";
    case "multi_source":
      return "Multiple sources";
    default:
      return "Unknown";
  }
}

function formatSectionRanks(
  appearances: TopicDetailView["sectionAppearancesToday"]
): string {
  return appearances
    .map((s) => `${s.sectionLabel}${s.rankPosition != null ? ` #${s.rankPosition}` : ""}`)
    .join(" · ");
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function itemDisplayKind(item: EvidenceItem): DisplayEvidenceKind {
  if (
    item.label.toLowerCase().includes("status") ||
    item.label.toLowerCase().includes("sitemap")
  ) {
    return item.label.toLowerCase().includes("status") ? "status_incident" : item.kind;
  }
  return item.kind;
}

function groupEvidence(items: TopicDetailView["evidence"]) {
  const groups: Record<DisplayEvidenceKind, EvidenceItem[]> = {
    fact: [],
    market_signal: [],
    protocol_signal: [],
    status_incident: [],
    interpretation: [],
  };
  if (!items) return groups;
  for (const item of items.evidenceItems) {
    const kind = itemDisplayKind(item);
    groups[kind].push(item);
  }
  return groups;
}

type Props = {
  topic: TopicDetailView;
};

export default function TopicDetailContent({ topic }: Props) {
  const brief = buildTopicNarrativeBrief(topic);
  const metricEvidence = buildTopicMetricEvidence(topic);
  const mixedMetrics = buildTopicMixedMetrics(topic);
  const sectionCount = topic.sectionAppearancesToday.length;
  const personaInput = personaInputFromTopic(topic);
  const creatorPersona = buildPersonaDisplayNote(
    "creator",
    personaInput,
    topic.creatorAngle
  );
  const investorPersona = buildPersonaDisplayNote(
    "investor",
    personaInput,
    topic.investorWatchline
  );
  const builderPersona = buildPersonaDisplayNote(
    "builder",
    personaInput,
    topic.builderNote
  );
  const scoreRows = explainScoreBreakdown(topic.scoreBreakdown, {
    uniqueSourceCount: topic.uniqueSourceCount,
  });
  const evidenceGroups = groupEvidence(topic.evidence);
  const displayOrder: DisplayEvidenceKind[] = [
    "fact",
    "status_incident",
    "market_signal",
    "protocol_signal",
    "interpretation",
  ];
  const flatEvidenceItems = displayOrder.flatMap((kind) => evidenceGroups[kind]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-bg-secondary/40 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/"
            className="text-[12px] font-semibold text-accent hover:text-accent-hover"
          >
            ← Back to Daily Heat
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                Topic intelligence
              </p>
              <h1 className="mt-2 font-heading text-[28px] font-bold leading-tight text-text-primary sm:text-[34px]">
                {topic.title}
              </h1>
            </div>
            {topic.heatScore != null ? (
              <div className="flex max-w-xs flex-col items-end gap-1.5 text-right">
                <HeatScoreBadge score={topic.heatScore} size="md" />
                <p className="text-[11px] leading-snug text-text-muted">
                  {buildHeatScoreContext(topic.heatScore)}
                </p>
              </div>
            ) : (
              <span
                className="inline-flex items-center rounded-full border border-border bg-bg-secondary px-2.5 py-1 text-[13px] font-semibold text-text-muted"
                title="No published ranking for this snapshot date"
              >
                Heat unavailable
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-bg-secondary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
              {CATEGORY_LABELS[topic.category]}
            </span>
            {sectionCount > 0 ? (
              <span className="inline-flex rounded-full border border-border px-2.5 py-0.5 text-[11px] text-text-secondary">
                Ranked in {sectionCount} section{sectionCount !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
          {sectionCount > 0 ? (
            <p className="mt-2 text-[11px] text-text-muted">
              {formatSectionRanks(topic.sectionAppearancesToday)}
            </p>
          ) : null}
          <p className="mt-3 text-[12px] text-text-muted">
            {formatStoryTimestampLine(topic.storyTimeKind, topic.storyAt)} · First seen{" "}
            {formatTime(topic.firstSeenAt)} · Snapshot {topic.rankingDate}
          </p>
          <p className="mt-1 text-[11px] text-text-muted/80">
            Scanner refreshed {formatTime(topic.lastUpdatedAt)}
          </p>
          <p className="mt-2 text-[12px] italic text-text-muted">
            Context only — not investment advice. Verify primary sources before acting.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {mixedMetrics ? (
          <section className="mb-6 rounded-[10px] border border-accent/25 bg-accent/5 p-5">
            <h2 className="font-heading text-[16px] font-bold uppercase tracking-wide text-text-primary">
              Signals in this topic
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
              {mixedMetrics.contextNote}
            </p>
            <div className="mt-4 space-y-3">
              {mixedMetrics.signals.map((signal) => (
                <div
                  key={signal.kind}
                  className="rounded-[8px] border border-border/60 bg-bg-card/80 px-4 py-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                    {signal.label}
                  </p>
                  <p className="mt-1 text-[13px] font-medium text-text-primary">{signal.title}</p>
                  <div className="mt-2 space-y-1.5">
                    {signal.currentValueLabel ? (
                      <MetricEvidenceRow label="Current" value={signal.currentValueLabel} />
                    ) : null}
                    {signal.changePctLabel ? (
                      <MetricEvidenceRow label="Change" value={signal.changePctLabel} />
                    ) : null}
                    <MetricEvidenceRow label="Source" value={signal.sourceName} />
                    {signal.snapshotLabel ? (
                      <MetricEvidenceRow label="Snapshot" value={signal.snapshotLabel} />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-[10px] border border-border bg-bg-card p-5">
          <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
            {brief.heading}
          </h2>
          <div className="mt-3 space-y-3">
            {brief.paragraphs.map((paragraph, i) => (
              <p
                key={`brief-p-${i}`}
                className="text-[14px] leading-relaxed text-text-primary"
              >
                {paragraph}
              </p>
            ))}
          </div>
          {brief.watchNext.length > 0 ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Watch next
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-text-secondary">
                {brief.watchNext.map((item, i) => (
                  <li key={`watch-${i}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {brief.caution ? (
            <p className="mt-4 text-[12px] leading-relaxed text-amber-200/90">{brief.caution}</p>
          ) : null}
          {brief.confidenceNote ? (
            <p className="mt-3 text-[12px] leading-relaxed text-text-muted">{brief.confidenceNote}</p>
          ) : null}
        </section>

        {metricEvidence ? (
          <>
            <section className="mt-6 rounded-[10px] border border-border bg-bg-card p-5">
              <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
                Metric evidence
              </h2>
              <div className="mt-3 space-y-2">
                <MetricEvidenceRow
                  label="Metric"
                  value={metricEvidence.evidence.metricLabel}
                />
                {metricEvidence.evidence.currentValueLabel ? (
                  <MetricEvidenceRow
                    label="Current"
                    value={metricEvidence.evidence.currentValueLabel}
                  />
                ) : null}
                {metricEvidence.evidence.previousValueLabel ? (
                  <MetricEvidenceRow
                    label="Previous"
                    value={metricEvidence.evidence.previousValueLabel}
                    muted={metricEvidence.evidence.derivedFields?.includes("previousValueLabel")}
                  />
                ) : null}
                {metricEvidence.evidence.changePctLabel ? (
                  <MetricEvidenceRow
                    label="Change"
                    value={metricEvidence.evidence.changePctLabel}
                  />
                ) : null}
                {metricEvidence.evidence.sourceName ? (
                  <MetricEvidenceRow
                    label="Source"
                    value={metricEvidence.evidence.sourceName}
                  />
                ) : null}
                {metricEvidence.evidence.snapshotLabel ? (
                  <MetricEvidenceRow
                    label="Snapshot"
                    value={metricEvidence.evidence.snapshotLabel}
                  />
                ) : null}
                <MetricEvidenceRow
                  label="Depth"
                  value={evidenceDepthLabel(metricEvidence.evidence.evidenceDepth)}
                />
              </div>
              {metricEvidence.evidence.limitations &&
              metricEvidence.evidence.limitations.length > 0 ? (
                <ul className="mt-4 space-y-1 text-[12px] leading-relaxed text-text-muted">
                  {metricEvidence.evidence.limitations.map((note, i) => (
                    <li key={`lim-${i}`}>{note}</li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section className="mt-6 rounded-[10px] border border-border bg-bg-card p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Confirmed facts
                  </h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-text-secondary">
                    {metricEvidence.confirmedFacts.map((fact, i) => (
                      <li key={`fact-${i}`}>{fact}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Possible interpretations
                  </h3>
                  <p className="mt-1 text-[11px] text-text-muted">
                    Not confirmed — hypotheses only.
                  </p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-text-secondary">
                    {metricEvidence.possibleInterpretations.map((item, i) => (
                      <li key={`interp-${i}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-[10px] border border-border bg-bg-card p-5">
              <h2 className="font-heading text-[16px] font-bold uppercase tracking-wide text-text-primary">
                Needs confirmation from
              </h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-text-secondary">
                {metricEvidence.needsConfirmation.map((item, i) => (
                  <li key={`confirm-${i}`}>{item}</li>
                ))}
              </ul>
            </section>
          </>
        ) : null}

        {topic.evidence ? (
          <section className="mt-6 rounded-[10px] border border-border bg-bg-card p-5">
            <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
              Evidence & sources
            </h2>

            {topic.evidence.sourceLinks.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {topic.evidence.sourceLinks.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-medium text-accent underline-offset-2 hover:underline"
                    >
                      {link.label} →
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">
              {topic.evidence.whatHappened}
            </p>

            {flatEvidenceItems.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {flatEvidenceItems.map((item, i) => (
                    <li
                      key={`ev-${i}`}
                      className="rounded-[8px] border border-border/50 bg-bg-secondary/40 px-3 py-2 text-[13px]"
                    >
                      <span className="text-text-primary">
                        {item.sourceName ? (
                          <span className="font-semibold text-text-secondary">
                            {item.sourceName}:{" "}
                          </span>
                        ) : null}
                        {item.text}
                      </span>
                    </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <section className="mt-6 rounded-[10px] border border-border bg-bg-card p-5">
          <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
            Related tokens & protocols
          </h2>
          {topic.tokens.length === 0 && topic.protocols.length === 0 ? (
            <p className="mt-3 text-[13px] text-text-muted">No linked tokens or protocols yet.</p>
          ) : (
            <div className="mt-3 space-y-4">
              {topic.tokens.length > 0 ? (
                <ul className="space-y-2">
                  {topic.tokens.map((t) => {
                    const tokenHref = canLinkTokenDetail(t.mintAddress, true)
                      ? tokenDetailPath(t.mintAddress!)
                      : null;
                    return (
                      <li
                        key={t.symbol + (t.mintAddress ?? "")}
                        className="flex flex-wrap items-center gap-2 text-[13px]"
                      >
                        {tokenHref ? (
                          <Link
                            href={tokenHref}
                            className="font-semibold text-heat hover:text-accent"
                          >
                            ${t.symbol}
                          </Link>
                        ) : (
                          <span className="font-semibold text-heat">${t.symbol}</span>
                        )}
                        {t.name ? (
                          <span className="text-text-secondary">{t.name}</span>
                        ) : null}
                        {t.mintAddress ? (
                          <code className="text-[11px] text-text-muted">{t.mintAddress}</code>
                        ) : null}
                        {tokenHref ? (
                          <Link
                            href={tokenHref}
                            className="text-[12px] font-semibold text-accent hover:underline"
                          >
                            Token context →
                          </Link>
                        ) : null}
                        {t.explorerUrl ? (
                          <a
                            href={t.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] text-accent hover:underline"
                          >
                            Solscan
                          </a>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {topic.protocols.length > 0 ? (
                <ul className="space-y-2">
                  {topic.protocols.map((p) => (
                    <li key={p.slug} className="text-[13px]">
                      <span className="font-semibold text-accent">{p.name}</span>
                      {p.category ? (
                        <span className="text-text-muted"> · {p.category}</span>
                      ) : null}
                      {p.websiteUrl ? (
                        <>
                          {" "}
                          <a
                            href={p.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline"
                          >
                            Website
                          </a>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[10px] border border-border bg-bg-card p-5">
          <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
            Persona notes
          </h2>
          <div className="mt-3 space-y-3">
            {creatorPersona ? (
              <div className="rounded-[8px] bg-bg-secondary/50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase text-text-muted">Creator angle</p>
                <p className="mt-1 text-[13px] text-text-primary">{creatorPersona}</p>
              </div>
            ) : null}
            {investorPersona ? (
              <div className="rounded-[8px] bg-bg-secondary/50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase text-text-muted">
                  Investor watch context
                </p>
                <p className="mt-1 text-[13px] text-text-primary">{investorPersona}</p>
              </div>
            ) : null}
            {builderPersona ? (
              <div className="rounded-[8px] bg-bg-secondary/50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase text-text-muted">
                  Builder / infra
                </p>
                <p className="mt-1 text-[13px] text-text-primary">{builderPersona}</p>
              </div>
            ) : null}
            {!creatorPersona && !investorPersona && !builderPersona ? (
              <p className="text-[13px] text-text-muted">No persona-specific notes stored.</p>
            ) : null}
          </div>
        </section>

        <section className="mt-6 rounded-[10px] border border-border bg-bg-card p-5">
          <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
            Source timeline
          </h2>
          {topic.timeline.length === 0 ? (
            <p className="mt-3 text-[13px] text-text-muted">No source timeline rows linked yet.</p>
          ) : (
            <>
              {topic.timeline.length > 1 ? (
                <p className="mt-2 text-[12px] text-text-muted">
                  Multiple sources contributed to this topic cluster.
                </p>
              ) : null}
              <ol className="mt-4 space-y-3">
                {topic.timeline.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-[8px] border border-border/60 bg-bg-secondary/40 px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                      <span className="font-semibold text-accent">{entry.sourceName}</span>
                      {entry.isPrimary ? (
                        <span className="rounded border border-border px-1 py-0.5">Primary</span>
                      ) : null}
                      <span>·</span>
                      <span>{entry.itemType}</span>
                      {entry.signal ? (
                        <>
                          <span>·</span>
                          <span>{entry.signal}</span>
                        </>
                      ) : null}
                      {entry.headlineOnly ? (
                        <span className="text-amber-200/90">headline-only</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[13px] font-medium text-text-primary">{entry.title}</p>
                    <p className="mt-1 text-[11px] text-text-muted">
                      {entry.publishedAt
                        ? `Published ${formatTime(entry.publishedAt)}`
                        : `Fetched ${formatTime(entry.fetchedAt)}`}
                    </p>
                    {entry.url ? (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-[12px] text-accent hover:underline"
                      >
                        Open source
                      </a>
                    ) : null}
                    {entry.headlineOnly ? (
                      <p className="mt-2 text-[11px] text-amber-200/90">
                        Headline-only discovery — article body was not ingested.
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        <details className="mt-6 rounded-[10px] border border-border bg-bg-card group">
          <summary className="cursor-pointer list-none px-5 py-4 text-[13px] font-semibold text-text-secondary transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
            <span className="text-accent group-open:text-text-primary">
              How this heat score was calculated
            </span>
            <span className="ml-2 text-[11px] font-normal text-text-muted">
              (scoring details)
            </span>
          </summary>
          <div className="border-t border-border px-5 py-4">
            <h2 className="font-heading text-[16px] font-bold uppercase tracking-wide text-text-primary">
              Scoring details
            </h2>
            <p className="mt-1 text-[13px] text-text-secondary">
              {topic.heatScore != null ? (
                <>
                  Rule-based heat {topic.heatScore} for {topic.rankingDate}. Components only
                  appear when they affected the score.
                </>
              ) : (
                <>
                  No published heat ranking for {topic.rankingDate}.
                  {topic.confidence > 0 ? (
                    <span className="mt-1 block text-[12px] text-text-muted">
                      Cluster confidence (not heat): {topic.confidence.toFixed(2)}
                    </span>
                  ) : null}
                </>
              )}
            </p>
            {topic.heatScore != null ? (
              <ScoreBreakdown
                breakdown={topic.scoreBreakdown as Record<string, number>}
                score={topic.heatScore}
                inline
              />
            ) : null}
            {scoreRows.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {scoreRows.map((row) => (
                  <li
                    key={row.key}
                    className="rounded-[8px] border border-border/50 bg-bg-secondary/40 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="font-semibold text-text-primary">{row.label}</span>
                      <span className="font-mono text-text-primary">
                        {row.points > 0 ? "+" : ""}
                        {row.points}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
                      {row.explanation}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12px] text-text-muted">No score components stored.</p>
            )}
          </div>
        </details>

        <footer className="mt-10 border-t border-border py-6 text-center text-[12px] text-text-muted">
          <Link href="/" className="text-accent hover:underline">
            Back to Daily Heat
          </Link>
          {" · "}
          <code className="text-accent">not investment advice</code>
        </footer>
      </main>
    </div>
  );
}
