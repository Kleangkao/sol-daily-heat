"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { HeatCardPersonaHighlight, HeatCardView } from "@/lib/types/heat";
import { isLiveTopicId, topicDetailPath } from "@/lib/heat/topic-link";
import { canLinkTokenDetail, tokenDetailPath } from "@/lib/heat/token-link";
import SignalTypeBadge from "@/components/ui/SignalTypeBadge";
import { CATEGORY_LABELS } from "@/lib/types/heat";
import {
  buildCardBadges,
  parseFeeDisplay,
} from "@/lib/heat/card-display";
import {
  buildReaderDisplayCopy,
  readerCopyInputFromCard,
} from "@/lib/heat/reader-signal-copy";
import SignalQualityBadges from "./SignalQualityBadges";
import HeatScoreBadge from "./HeatScoreBadge";
import EvidencePanel from "./EvidencePanel";
import ScoreBreakdown from "./ScoreBreakdown";
type Props = {
  item: HeatCardView;
  variant?: "default" | "compact";
  /** When true, live UUID topics link to /topics/[id] */
  detailEnabled?: boolean;
  personaHighlight?: HeatCardPersonaHighlight;
  /** Other homepage sections featuring this topic (client-derived) */
  alsoIn?: string[];
};

function PersonaHighlightBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-2 rounded-[8px] border border-accent/25 bg-accent/5 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">{label}</p>
      <p className="mt-1 text-[12px] leading-[1.4] text-text-primary">{text}</p>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (hours < 48) return `${hours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function HeatCard({
  item,
  variant = "default",
  detailEnabled = false,
  personaHighlight,
  alsoIn,
}: Props) {
  const titleSize = variant === "compact" ? "text-[16px]" : "text-[18px]";
  const showDetailLink = detailEnabled && isLiveTopicId(item.id);
  const detailHref = showDetailLink ? topicDetailPath(item.id) : null;

  const display = useMemo(() => {
    const readerInput = readerCopyInputFromCard(item);
    const badgeInput = {
      title: item.title,
      scoreBreakdown: item.scoreBreakdown,
      evidence: item.evidence,
      interpretationType: item.interpretationType,
      sourceSlugs: item.sourceSlugs,
      itemTypes: item.itemTypes,
      rankingSignals: item.rankingSignals,
    };
    const fee = parseFeeDisplay(item.title, item.scoreBreakdown);
    const reader = buildReaderDisplayCopy(readerInput);
    return {
      badges: buildCardBadges(badgeInput),
      whyRanked: reader.whyRanked,
      summary: reader.summary,
      whyHot: reader.whyHot,
      headline: fee.headline,
      feeCaution: reader.pctCaution ?? fee.feeCaution,
    };
  }, [item]);

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-[10px] border border-border bg-bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
            {CATEGORY_LABELS[item.category]}
          </span>
          {item.isUpdatedStory ? (
            <span className="inline-flex rounded-full border border-heat/40 bg-heat/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-heat">
              Updated story
            </span>
          ) : null}
        </div>
        <HeatScoreBadge score={item.heatScore} size="sm" />
      </div>

      {detailHref ? (
        <h3 className={`mt-2 font-heading font-bold leading-[1.25] ${titleSize}`}>
          <Link
            href={detailHref}
            className="text-text-primary transition-colors hover:text-accent"
          >
            {display.headline}
          </Link>
        </h3>
      ) : (
        <h3
          className={`mt-2 font-heading font-bold leading-[1.25] text-text-primary ${titleSize}`}
        >
          {display.headline}
        </h3>
      )}

      {display.feeCaution ? (
        <p className="mt-1.5 text-[11px] leading-[1.35] text-amber-200/90">
          {display.feeCaution}
        </p>
      ) : null}

      <SignalQualityBadges badges={display.badges} />

      {alsoIn && alsoIn.length > 0 ? (
        <p className="mt-2 text-[10px] text-text-muted">
          Also in {alsoIn.join(", ")}
        </p>
      ) : null}

      {personaHighlight === "creator" && item.creatorAngle ? (
        <PersonaHighlightBlock label="Creator angle" text={item.creatorAngle} />
      ) : null}
      {personaHighlight === "investor" && item.investorWatchline ? (
        <PersonaHighlightBlock label="Investor watch" text={item.investorWatchline} />
      ) : null}

      <p className="mt-2 text-[12px] leading-[1.35] text-text-secondary">
        <span className="font-semibold text-text-muted">Why ranked:</span>{" "}
        {display.whyRanked}
      </p>

      <p
        className="mt-2 text-[13px] leading-[1.45] text-text-secondary"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: variant === "compact" ? 2 : 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {display.summary}
      </p>

      <div className="mt-3 rounded-[8px] border border-border/60 bg-bg-secondary/50 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Why hot
        </p>
        <p className="mt-1 text-[12px] leading-[1.4] text-text-primary">{display.whyHot}</p>
      </div>

      {(item.relatedTokens.length > 0 || item.relatedProjects.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.relatedTokens.map((t) => {
            const tokenHref = canLinkTokenDetail(t.mintAddress, detailEnabled)
              ? tokenDetailPath(t.mintAddress!)
              : null;
            return tokenHref ? (
              <Link
                key={t.symbol + t.mintAddress}
                href={tokenHref}
                className="inline-flex items-center rounded-full border border-border bg-bg-primary px-2 py-0.5 text-[11px] font-medium text-heat transition-colors hover:border-accent hover:text-accent"
              >
                ${t.symbol}
              </Link>
            ) : (
              <span
                key={t.symbol}
                className="inline-flex items-center rounded-full border border-border bg-bg-primary px-2 py-0.5 text-[11px] font-medium text-heat"
              >
                ${t.symbol}
              </span>
            );
          })}
          {item.relatedProjects.map((p) => (
            <span
              key={p.name}
              className="inline-flex items-center rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-semibold text-accent"
            >
              {p.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary">
        {item.rankPosition != null ? (
          <>
            <span className="font-mono text-accent">#{item.rankPosition}</span>
            <span>·</span>
          </>
        ) : null}
        <span>{item.sourceCount} source{item.sourceCount !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>First seen {formatTime(item.firstSeen)}</span>
        <span>·</span>
        <span>Updated {formatTime(item.lastUpdated)}</span>
        <SignalTypeBadge type={item.interpretationType} />
      </div>

      <ScoreBreakdown breakdown={item.scoreBreakdown} score={item.heatScore} />

      {item.evidence ? <EvidencePanel evidence={item.evidence} /> : null}

      <p className="mt-3 border-t border-border pt-3 text-[11px] leading-[1.35] text-text-muted">
        <span className="font-semibold text-danger">Risk:</span> {item.riskNote}
      </p>

      {detailHref ? (
        <Link
          href={detailHref}
          className="mt-3 inline-flex text-[12px] font-semibold text-accent hover:text-accent-hover"
        >
          View topic details →
        </Link>
      ) : null}
    </article>
  );
}
