"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { HeatCardPersonaHighlight, HeatCardView } from "@/lib/types/heat";
import { isLiveTopicId, topicDetailPath } from "@/lib/heat/topic-link";
import { canLinkTokenDetail, tokenDetailPath } from "@/lib/heat/token-link";
import SignalTypeBadge from "@/components/ui/SignalTypeBadge";
import { CATEGORY_LABELS } from "@/lib/types/heat";
import { buildCardBadges, parseFeeDisplay } from "@/lib/heat/card-display";
import { buildHomepageCardCopy } from "@/lib/heat/homepage-card-copy";
import { buildTokenCardHeadline } from "@/lib/heat/token-display";
import { readerCopyInputFromCard } from "@/lib/heat/reader-signal-copy";
import { buildCardPersonaDisplay } from "@/lib/heat/persona-display-copy";
import { isGenericRiskNote } from "@/lib/heat/risk-note";
import SignalQualityBadges from "./SignalQualityBadges";
import HeatScoreBadge from "./HeatScoreBadge";
import { formatStoryTimestampLine } from "@/lib/heat/story-timestamp";

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
    const preview = buildHomepageCardCopy(readerInput);
    const cardTitle = buildTokenCardHeadline(item, fee.headline);
    return {
      badges: buildCardBadges(badgeInput),
      signalLabel: preview.signalLabel,
      brief: preview.brief,
      caution: preview.caution,
      mixedMetricHint: preview.mixedMetricHint,
      headline: cardTitle.headline,
      subtitle: cardTitle.subtitle,
      creatorPersona: buildCardPersonaDisplay("creator", item),
      investorPersona: buildCardPersonaDisplay("investor", item),
    };
  }, [item]);

  const specificCaution =
    display.caution ??
    (!isGenericRiskNote(item.riskNote) ? item.riskNote : undefined);

  return (
    <article className="group flex flex-col overflow-hidden rounded-[12px] border border-border bg-bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg hover:shadow-black/20">
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
        <HeatScoreBadge score={item.heatScore} size="sm" showBucket />
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

      {display.subtitle ? (
        <p className="mt-1 text-[11px] text-text-muted">{display.subtitle}</p>
      ) : null}

      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-accent/90">
        {display.signalLabel}
      </p>

      {display.mixedMetricHint ? (
        <p className="mt-1 text-[10px] leading-snug text-text-muted">{display.mixedMetricHint}</p>
      ) : null}

      <p
        className="mt-2 text-[13px] leading-[1.45] text-text-secondary"
        style={
          variant === "compact"
            ? {
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
            : undefined
        }
      >
        {display.brief}
      </p>

      {specificCaution ? (
        <p className="mt-2 text-[11px] leading-[1.35] text-amber-200/90">{specificCaution}</p>
      ) : null}

      <SignalQualityBadges badges={display.badges} />

      {alsoIn && alsoIn.length > 0 ? (
        <p className="mt-2 text-[10px] text-text-muted">Also in {alsoIn.join(", ")}</p>
      ) : null}

      {personaHighlight === "creator" && display.creatorPersona ? (
        <PersonaHighlightBlock label="Creator angle" text={display.creatorPersona} />
      ) : null}
      {personaHighlight === "investor" && display.investorPersona ? (
        <PersonaHighlightBlock label="Investor watch" text={display.investorPersona} />
      ) : null}

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
        <span>
          {item.sourceCount} source{item.sourceCount !== 1 ? "s" : ""}
        </span>
        <span>·</span>
        <span>
          {formatStoryTimestampLine(item.storyTimeKind, item.storyAt)}
        </span>
        <SignalTypeBadge type={item.interpretationType} />
      </div>

      {detailHref ? (
        <Link
          href={detailHref}
          className="mt-3 inline-flex text-[12px] font-semibold text-heat hover:text-heat-hover"
        >
          Open brief →
        </Link>
      ) : null}
    </article>
  );
}
