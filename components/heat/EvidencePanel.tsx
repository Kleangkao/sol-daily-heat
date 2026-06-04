"use client";

import type { EvidenceKind, TopicEvidence } from "@/lib/types/evidence";

const KIND_STYLES: Record<
  EvidenceKind,
  { badge: string; label: string }
> = {
  fact: {
    badge: "bg-bg-secondary text-text-primary border-border",
    label: "Fact",
  },
  market_signal: {
    badge: "bg-heat/10 text-heat border-heat/30",
    label: "Market signal",
  },
  protocol_signal: {
    badge: "bg-accent/10 text-accent border-accent/30",
    label: "Protocol signal",
  },
  interpretation: {
    badge: "bg-bg-primary text-text-muted border-border",
    label: "Interpretation",
  },
};

function KindBadge({ kind }: { kind: EvidenceKind }) {
  const s = KIND_STYLES[kind];
  return (
    <span
      className={`inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${s.badge}`}
    >
      {s.label}
    </span>
  );
}

type Props = {
  evidence: TopicEvidence;
};

export default function EvidencePanel({ evidence }: Props) {
  const hasItems = evidence.evidenceItems.length > 0;
  const hasLinks = evidence.sourceLinks.length > 0;
  const hasBreakdown = evidence.signalBreakdown.length > 0;

  return (
    <details className="mt-2 group/ev">
      <summary className="cursor-pointer text-[11px] font-semibold text-accent hover:text-accent-hover">
        Evidence — why this is ranked
      </summary>
      <div className="mt-2 space-y-3 rounded-[8px] border border-border/60 bg-bg-secondary/40 px-3 py-2.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            What happened
          </p>
          <p className="mt-1 text-[12px] leading-[1.45] text-text-primary">
            {evidence.whatHappened}
          </p>
        </div>

        {hasItems ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Evidence
            </p>
            <ul className="mt-1.5 space-y-2">
              {evidence.evidenceItems.map((item, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-[1.4]">
                  <KindBadge kind={item.kind} />
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
        ) : null}

        {hasLinks ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Source links
            </p>
            <ul className="mt-1 space-y-1">
              {evidence.sourceLinks.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-accent underline-offset-2 hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasBreakdown ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Signal breakdown (heat score)
            </p>
            <ul className="mt-1 space-y-1">
              {evidence.signalBreakdown.map((s) => (
                <li
                  key={s.key}
                  className="flex items-center justify-between gap-2 text-[11px]"
                >
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <KindBadge kind={s.kind === "fact" ? "fact" : "interpretation"} />
                    {s.label}
                  </span>
                  <span className="font-mono text-text-primary">+{s.points}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Interpretation
          </p>
          <p className="mt-1 text-[12px] leading-[1.4] text-text-secondary">
            {evidence.interpretationNote}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Watch next
          </p>
          <p className="mt-1 text-[12px] leading-[1.4] text-text-primary">
            {evidence.watchNext}
          </p>
        </div>

        {(evidence.factVsInterpretation.facts.length > 0 ||
          evidence.factVsInterpretation.interpretations.length > 0) && (
          <div className="border-t border-border/50 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Facts vs interpretation
            </p>
            {evidence.factVsInterpretation.facts.length > 0 ? (
              <ul className="mt-1 list-inside list-disc text-[11px] text-text-primary">
                {evidence.factVsInterpretation.facts.slice(0, 4).map((f, i) => (
                  <li key={`f-${i}`}>{f}</li>
                ))}
              </ul>
            ) : null}
            {evidence.factVsInterpretation.interpretations.length > 0 ? (
              <ul className="mt-1.5 list-inside list-disc text-[11px] text-text-muted">
                {evidence.factVsInterpretation.interpretations.slice(0, 3).map((x, i) => (
                  <li key={`i-${i}`}>{x}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </details>
  );
}
