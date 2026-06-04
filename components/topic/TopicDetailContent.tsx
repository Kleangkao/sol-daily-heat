import Link from "next/link";
import type { TopicDetailView } from "@/lib/types/topic-detail";
import type { EvidenceItem, EvidenceKind } from "@/lib/types/evidence";
import { CATEGORY_LABELS } from "@/lib/types/heat";
import { canLinkTokenDetail, tokenDetailPath } from "@/lib/heat/token-link";
import HeatScoreBadge from "@/components/heat/HeatScoreBadge";
import ScoreBreakdown from "@/components/heat/ScoreBreakdown";
import { explainScoreBreakdown } from "@/lib/heat/score-breakdown-explainer";
type DisplayEvidenceKind = EvidenceKind | "status_incident";

const KIND_LABELS: Record<DisplayEvidenceKind, string> = {
  fact: "Fact",
  market_signal: "Market signal",
  protocol_signal: "Protocol signal",
  interpretation: "Interpretation",
  status_incident: "Status / incident",
};

const KIND_BADGE: Record<DisplayEvidenceKind, string> = {
  fact: "bg-bg-secondary text-text-primary border-border",
  market_signal: "bg-heat/10 text-heat border-heat/30",
  protocol_signal: "bg-accent/10 text-accent border-accent/30",
  interpretation: "bg-bg-primary text-text-muted border-border",
  status_incident: "bg-danger/10 text-danger border-danger/30",
};

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
              <HeatScoreBadge score={topic.heatScore} size="md" />
            ) : (
              <span
                className="inline-flex items-center rounded-full border border-border bg-bg-secondary px-2.5 py-1 text-[13px] font-semibold text-text-muted"
                title="No published ranking for this snapshot date"
              >
                Heat unavailable
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-bg-secondary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
              {CATEGORY_LABELS[topic.category]}
            </span>
            {topic.sectionAppearancesToday.map((s) => (
              <span
                key={`${s.section}-${s.rankPosition}`}
                className="inline-flex rounded-full border border-border px-2.5 py-0.5 text-[11px] text-text-secondary"
              >
                {s.sectionLabel}
                {s.rankPosition != null ? ` #${s.rankPosition}` : ""} · {s.heatScore} heat
              </span>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-text-muted">
            First seen {formatTime(topic.firstSeenAt)} · Last updated{" "}
            {formatTime(topic.lastUpdatedAt)} · Snapshot {topic.rankingDate}
          </p>
          <p className="mt-2 text-[12px] italic text-text-muted">
            Context only — not investment advice. Verify primary sources before acting.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[10px] border border-border bg-bg-card p-5">
          <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
            Summary
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-text-primary">{topic.summary}</p>
          <div className="mt-4 rounded-[8px] border border-border/60 bg-bg-secondary/50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Why hot
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-text-primary">{topic.whyHot}</p>
          </div>
          {topic.evidence?.watchNext ? (
            <div className="mt-3 rounded-[8px] border border-accent/20 bg-accent/5 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                Why it matters / watch next
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-text-primary">
                {topic.evidence.watchNext}
              </p>
            </div>
          ) : null}
          <p className="mt-4 border-t border-border pt-3 text-[12px] text-text-muted">
            <span className="font-semibold text-danger">Risk:</span> {topic.riskNote}
          </p>
          {topic.evidence?.interpretationNote ? (
            <p className="mt-2 text-[12px] text-text-secondary">
              <span className="font-semibold text-text-muted">Interpretation:</span>{" "}
              {topic.evidence.interpretationNote}
            </p>
          ) : null}
          {topic.headlineOnlySources ? (
            <p className="mt-3 rounded-[8px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100/90">
              Headline-only discovery — article body was not ingested. Open source links to
              verify.
            </p>
          ) : null}
        </section>

        {topic.evidence ? (
          <section className="mt-6 rounded-[10px] border border-border bg-bg-card p-5">
            <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
              Evidence
            </h2>
            <p className="mt-1 text-[13px] text-text-secondary">{topic.evidence.whatHappened}</p>

            {displayOrder.map((kind) => {
              const items = evidenceGroups[kind];
              if (items.length === 0) return null;
              return (
                <div key={kind} className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    {KIND_LABELS[kind]}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {items.map((item, i) => (
                      <li
                        key={`${kind}-${i}`}
                        className="flex gap-2 rounded-[8px] border border-border/50 bg-bg-secondary/40 px-3 py-2 text-[13px]"
                      >
                        <span
                          className={`inline-flex h-fit shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${KIND_BADGE[kind]}`}
                        >
                          {KIND_LABELS[kind]}
                        </span>
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
                </div>
              );
            })}

            {topic.evidence.sourceLinks.length > 0 ? (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Source links
                </p>
                <ul className="mt-2 space-y-1.5">
                  {topic.evidence.sourceLinks.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] text-accent underline-offset-2 hover:underline"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="mt-6 rounded-[10px] border border-border bg-bg-card p-5">
          <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
            Heat score breakdown
          </h2>
          <p className="mt-1 text-[13px] text-text-secondary">
            {topic.heatScore != null ? (
              <>
                Rule-based heat {topic.heatScore} for {topic.rankingDate}. Components only appear
                when they affected the score.
              </>
            ) : (
              <>
                No published heat ranking for {topic.rankingDate}.
                {topic.confidence > 0 ? (
                  <span className="block mt-1 text-[12px] text-text-muted">
                    Cluster confidence (not heat): {topic.confidence.toFixed(2)}
                  </span>
                ) : null}
              </>
            )}
          </p>
          {topic.heatScore != null ? (
            <div className="mt-3">
              <ScoreBreakdown
                breakdown={topic.scoreBreakdown as Record<string, number>}
                score={topic.heatScore}
              />
            </div>
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
        </section>

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
            {topic.creatorAngle ? (
              <div className="rounded-[8px] bg-bg-secondary/50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase text-text-muted">Creator angle</p>
                <p className="mt-1 text-[13px] text-text-primary">{topic.creatorAngle}</p>
              </div>
            ) : null}
            {topic.investorWatchline ? (
              <div className="rounded-[8px] bg-bg-secondary/50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase text-text-muted">
                  Investor watch context
                </p>
                <p className="mt-1 text-[13px] text-text-primary">{topic.investorWatchline}</p>
              </div>
            ) : null}
            {topic.builderNote ? (
              <div className="rounded-[8px] bg-bg-secondary/50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase text-text-muted">
                  Builder / infra
                </p>
                <p className="mt-1 text-[13px] text-text-primary">{topic.builderNote}</p>
              </div>
            ) : null}
            {!topic.creatorAngle && !topic.investorWatchline && !topic.builderNote ? (
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
