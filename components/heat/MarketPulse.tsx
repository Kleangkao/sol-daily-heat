"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import SignalQualityBadges from "./SignalQualityBadges";
import { isValidMintParam, tokenDetailPath } from "@/lib/heat/token-link";
import {
  resolveHotTapeDisplay,
  resolvePulseTokenDisplay,
} from "@/lib/heat/token-display";
import {
  changeTone,
  formatChange24h,
  formatPriceUsd,
  priceMissingTitle,
} from "@/lib/market-pulse/format";
import { hotTapeBadges } from "@/lib/market-pulse/hot-tape-badges";
import { pulseLabelsToBadges } from "@/lib/market-pulse/pulse-label-badges";
import { splitHotTokens } from "@/lib/market-pulse/split-hot-tokens";
import type { HotTapeItem, MarketPulseResponse, PulseTokenRow } from "@/lib/market-pulse/types";

/** Client poll interval — reads cached pulse snapshot (cron refreshes prices ~30m). */
const PULSE_CLIENT_REFRESH_MS = 120_000;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CHANGE_CLASS = {
  up: "text-accent",
  down: "text-rose-400",
  flat: "text-text-muted",
} as const;

type Layout = "rail" | "mobile";

type Props = {
  heatDataSource?: string;
  layout?: Layout;
  /** Mints featured in New Tokens. De-emphasize duplicate scanner rows. */
  newTokenMints?: Set<string>;
};

function TokenLogo({
  mint,
  logoUrl,
  size = 20,
}: {
  mint: string;
  logoUrl?: string | null;
  size?: number;
}) {
  const src = logoUrl ?? `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`;
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-bg-secondary object-cover"
      aria-hidden
      unoptimized
    />
  );
}

function TokenChip({
  row,
  prominent = false,
  compact = false,
  linkEnabled = false,
  fullWidth = false,
}: {
  row: PulseTokenRow;
  prominent?: boolean;
  compact?: boolean;
  linkEnabled?: boolean;
  fullWidth?: boolean;
}) {
  const display = resolvePulseTokenDisplay(row);
  const price = row.priceUsd ?? null;
  const chg = row.change24hPct ?? null;
  const tone = changeTone(chg);
  const priceLabel = formatPriceUsd(price);
  const missingPrice = priceLabel === "—";
  const badges = pulseLabelsToBadges(row.labels);
  const href = linkEnabled && isValidMintParam(row.mint) ? tokenDetailPath(row.mint) : null;

  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        {row.mint ? <TokenLogo mint={row.mint} logoUrl={row.logoUrl} size={prominent ? 22 : 18} /> : null}
        <span
          className={
            prominent
              ? "text-[12px] font-bold uppercase tracking-wide text-accent"
              : "text-[10px] font-semibold uppercase tracking-wide text-text-secondary"
          }
        >
          {display.primaryLabel}
        </span>
      </div>
      {display.secondaryLabel ? (
        <span className="mt-0.5 font-mono text-[9px] text-text-muted">{display.secondaryLabel}</span>
      ) : null}
      <span
        className={
          prominent
            ? "mt-0.5 font-heading text-[18px] font-bold leading-tight text-text-primary"
            : "mt-0.5 text-[13px] font-semibold leading-tight text-text-primary"
        }
        title={missingPrice ? priceMissingTitle(display.primaryLabel) : undefined}
      >
        {priceLabel}
      </span>
      <span
        className={`mt-0.5 text-[10px] font-medium ${CHANGE_CLASS[tone]}`}
        title={chg == null ? "No 24h change from Jupiter" : undefined}
      >
        {formatChange24h(chg)} <span className="text-text-muted">24h</span>
      </span>
      {badges.length > 0 ? (
        <div className="mt-1 [&_span]:text-[9px]">
          <SignalQualityBadges badges={badges} />
        </div>
      ) : null}
    </>
  );

  const widthClass = fullWidth ? "w-full min-w-0" : "";
  const className = prominent
    ? `flex flex-col justify-center rounded-[10px] border border-accent/30 bg-bg-card px-3 py-2.5 transition-colors hover:border-accent ${widthClass}`
    : compact
      ? `flex flex-col justify-center rounded-[8px] border border-border bg-bg-card px-2 py-1.5 transition-colors hover:border-accent/40 ${widthClass}`
      : `flex min-w-[92px] flex-1 flex-col justify-center rounded-[10px] border border-border bg-bg-card px-2.5 py-2 transition-colors hover:border-accent/40 sm:max-w-[140px] ${widthClass}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

function formatTapeCaption(item: HotTapeItem): string | null {
  if (/^DexScreener boost:/i.test(item.title)) return null;
  if (/^New pair:/i.test(item.title)) return "New trading pair";
  return item.title;
}

function TapeRow({
  item,
  linkEnabled,
}: {
  item: HotTapeItem;
  linkEnabled: boolean;
}) {
  const display = resolveHotTapeDisplay(item);
  const caption = formatTapeCaption(item);
  const tokenHref =
    linkEnabled && item.mint && isValidMintParam(item.mint)
      ? tokenDetailPath(item.mint)
      : null;

  const inner = (
    <div className="flex min-h-0 flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        {item.mint ? (
          <TokenLogo mint={item.mint} logoUrl={item.logoUrl} size={16} />
        ) : null}
        <span className="shrink-0 text-[11px] font-semibold text-text-primary">
          {display.primaryLabel}
        </span>
        {display.secondaryLabel ? (
          <span className="font-mono text-[9px] text-text-muted">{display.secondaryLabel}</span>
        ) : null}
      </div>
      {caption ? (
        <span className="truncate text-[10px] text-text-muted">{caption}</span>
      ) : null}
      <SignalQualityBadges badges={hotTapeBadges(item)} />
    </div>
  );

  const shell = "rounded-[8px] border border-border bg-bg-card px-2 py-1.5 transition-colors hover:border-accent/40";

  if (tokenHref) {
    return (
      <Link href={tokenHref} className={`block ${shell}`}>
        {inner}
      </Link>
    );
  }
  if (item.canonicalUrl) {
    return (
      <a
        href={item.canonicalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`block ${shell}`}
      >
        {inner}
      </a>
    );
  }
  return <div className={shell}>{inner}</div>;
}

export default function MarketPulse({
  heatDataSource,
  layout = "rail",
  newTokenMints,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data, isLoading } = useSWR<MarketPulseResponse>("/api/market/pulse", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: PULSE_CLIENT_REFRESH_MS,
  });

  const pulse = data;
  const anchor = pulse?.anchor;
  const hotTokens = useMemo(() => pulse?.hotTokens ?? [], [pulse?.hotTokens]);
  const linkEnabled = pulse?.dataSource === "live";

  const { gainers, droppers, highRisk, usedMints } = useMemo(
    () => splitHotTokens(hotTokens),
    [hotTokens]
  );

  const displayedMints = useMemo(() => {
    const mints = new Set(usedMints);
    if (anchor?.mint) mints.add(anchor.mint);
    return mints;
  }, [usedMints, anchor?.mint]);

  const filteredTape = useMemo(() => {
    const tape = pulse?.hotTape ?? [];
    return tape.filter((item) => {
      if (item.mint && displayedMints.has(item.mint)) return false;
      if (item.mint && newTokenMints?.has(item.mint)) return false;
      return true;
    });
  }, [pulse?.hotTape, newTokenMints, displayedMints]);

  const newTrendingOverlapCount = useMemo(
    () =>
      (pulse?.hotTape ?? []).filter((item) => item.mint && newTokenMints?.has(item.mint)).length,
    [pulse?.hotTape, newTokenMints]
  );

  const showStale =
    pulse?.stale &&
    pulse.dataSource === "live" &&
    (anchor?.priceUsd != null || hotTokens.some((t) => t.priceUsd != null));

  const noPulse =
    !isLoading &&
    pulse &&
    pulse.dataSource !== "live" &&
    heatDataSource !== "mock";

  if (heatDataSource === "mock" && pulse?.dataSource === "mock") {
    return null;
  }

  const headingClass =
    layout === "rail"
      ? "editorial-pipe font-heading text-[14px] font-bold uppercase tracking-tight text-text-primary"
      : "editorial-pipe font-heading text-[16px] font-bold uppercase tracking-tight text-text-primary";

  const tokenGroupClass =
    layout === "rail" ? "space-y-1.5" : "grid grid-cols-2 gap-2";

  const body = (
    <>
      {isLoading && !pulse ? (
        <p className="mt-2 text-[11px] text-text-muted">Loading market context…</p>
      ) : null}

      {noPulse ? (
        <div className="mt-2">
          <p className="text-[11px] text-text-muted">
            Market context is updating. Check back shortly.
          </p>
        </div>
      ) : null}

      {anchor ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            SOL PRICE CHECK
          </p>
          <div className="mt-1.5">
            <TokenChip
              row={anchor}
              prominent
              compact={layout === "rail"}
              fullWidth={layout === "mobile"}
              linkEnabled={linkEnabled}
            />
          </div>
        </div>
      ) : null}

      {gainers.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            TOP MOVERS
          </p>
          <div className={`mt-1.5 ${tokenGroupClass}`}>
            {gainers.map((row) => (
              <TokenChip
                key={row.mint}
                row={row}
                compact
                fullWidth={layout === "mobile"}
                linkEnabled={linkEnabled}
              />
            ))}
          </div>
        </div>
      ) : null}

      {droppers.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            BIGGEST DROPS
          </p>
          <div className={`mt-1.5 ${tokenGroupClass}`}>
            {droppers.map((row) => (
              <TokenChip
                key={`drop-${row.mint}`}
                row={row}
                compact
                fullWidth={layout === "mobile"}
                linkEnabled={linkEnabled}
              />
            ))}
          </div>
        </div>
      ) : null}

      {highRisk.length > 0 ? (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            BOOSTED &amp; VOLATILE
          </p>
          <div className={`mt-1.5 ${tokenGroupClass}`}>
            {highRisk.map((row) => (
              <TokenChip
                key={`risk-${row.mint}`}
                row={row}
                compact
                fullWidth={layout === "mobile"}
                linkEnabled={linkEnabled}
              />
            ))}
          </div>
        </div>
      ) : null}

      {filteredTape.length > 0 ? (
        <details className="mt-3 group">
          <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-wide text-text-secondary hover:text-accent">
            More on the board ({filteredTape.length})
          </summary>
          <div className="mt-1.5 space-y-1">
            {filteredTape.slice(0, layout === "rail" ? 4 : 6).map((item) => (
              <TapeRow key={item.mint ?? item.title} item={item} linkEnabled={linkEnabled} />
            ))}
          </div>
        </details>
      ) : null}

      {newTrendingOverlapCount > 0 ? (
        <p className="mt-2 text-[10px] text-text-muted">
          {newTrendingOverlapCount} also{" "}
          {newTrendingOverlapCount === 1 ? "appears" : "appear"} in New &amp; Trending below.
        </p>
      ) : null}

      <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
        Paid boosts are visibility only, not recommendations.
      </p>
    </>
  );

  if (layout === "mobile") {
    return (
      <section
        className="mb-5 rounded-[12px] border border-border bg-bg-secondary/40"
        aria-labelledby="market-pulse-mobile-heading"
      >
        <button
          type="button"
          className="flex min-h-[48px] w-full items-center justify-between gap-2 px-3 py-3 text-left"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
        >
          <div>
            <h2
              id="market-pulse-mobile-heading"
              className={headingClass}
            >
              Daily heat board
            </h2>
            <p className="text-[11px] text-text-muted">
              Prices, 24h moves, and token highlights
            </p>
          </div>
          <span className="text-[11px] text-text-muted">{mobileOpen ? "−" : "+"}</span>
        </button>
        {mobileOpen ? <div className="border-t border-border px-3 pb-3">{body}</div> : null}
        {showStale ? (
          <p className="border-t border-border px-3 py-1.5 text-[10px] text-heat/90">
            Prices delayed
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className="rounded-[12px] border border-border bg-bg-secondary/30 p-3"
      aria-labelledby="market-pulse-rail-heading"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 id="market-pulse-rail-heading" className={headingClass}>
            Daily heat board
          </h2>
          <p className="mt-0.5 text-[10px] text-text-muted">
            Prices, 24h moves, and token highlights
          </p>
        </div>
        {showStale ? (
          <span className="rounded-full border border-heat/40 bg-heat/10 px-1.5 py-0.5 text-[9px] font-semibold text-heat">
            Delayed
          </span>
        ) : null}
      </div>
      {body}
    </section>
  );
}
