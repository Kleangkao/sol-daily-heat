"use client";

import Link from "next/link";
import useSWR from "swr";
import SignalQualityBadges from "./SignalQualityBadges";
import { isValidMintParam, tokenDetailPath } from "@/lib/heat/token-link";
import {
  changeTone,
  formatChange24h,
  formatPriceUsd,
  priceMissingTitle,
} from "@/lib/market-pulse/format";
import { hotTapeBadges } from "@/lib/market-pulse/hot-tape-badges";
import { pulseLabelsToBadges } from "@/lib/market-pulse/pulse-label-badges";
import type { MarketPulseResponse, PulseTokenRow } from "@/lib/market-pulse/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CHANGE_CLASS = {
  up: "text-emerald-400",
  down: "text-rose-400",
  flat: "text-text-muted",
} as const;

type Props = {
  heatDataSource?: string;
};

function TokenChip({
  row,
  prominent = false,
  linkEnabled = false,
}: {
  row: PulseTokenRow;
  prominent?: boolean;
  linkEnabled?: boolean;
}) {
  const price = row.priceUsd ?? null;
  const chg = row.change24hPct ?? null;
  const tone = changeTone(chg);
  const priceLabel = formatPriceUsd(price);
  const missingPrice = priceLabel === "—";
  const badges = pulseLabelsToBadges(row.labels);
  const href = linkEnabled && isValidMintParam(row.mint) ? tokenDetailPath(row.mint) : null;

  const inner = (
    <>
      <span
        className={
          prominent
            ? "text-[13px] font-bold uppercase tracking-wide text-accent"
            : "text-[11px] font-semibold uppercase tracking-wide text-text-secondary"
        }
      >
        {row.symbol}
      </span>
      <span
        className={
          prominent
            ? "mt-0.5 font-heading text-[21px] font-bold leading-tight text-text-primary"
            : "mt-0.5 text-[14px] font-semibold leading-tight text-text-primary"
        }
        title={missingPrice ? priceMissingTitle(row.symbol) : undefined}
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
        <div className="mt-1.5 [&_span]:text-[9px]">
          <SignalQualityBadges badges={badges} />
        </div>
      ) : null}
    </>
  );

  const className = prominent
    ? "flex min-w-[132px] flex-col justify-center rounded-[10px] border border-accent/30 bg-bg-card px-3.5 py-2.5 transition-colors hover:border-accent lg:min-w-[148px]"
    : "flex min-w-[92px] flex-1 flex-col justify-center rounded-[10px] border border-border bg-bg-card px-2.5 py-2 transition-colors hover:border-accent/40 sm:max-w-[140px]";

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

export default function MarketPulse({ heatDataSource }: Props) {
  const { data, isLoading } = useSWR<MarketPulseResponse>("/api/market/pulse", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 600_000,
  });

  const pulse = data;
  const anchor = pulse?.anchor;
  const hotTokens = pulse?.hotTokens ?? [];

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

  return (
    <section
      className="border-b border-border bg-bg-secondary/30 px-4 py-6 sm:px-6 lg:px-8"
      aria-labelledby="market-pulse-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2
              id="market-pulse-heading"
              className="font-heading text-[20px] font-bold uppercase tracking-tight text-text-primary sm:text-[22px]"
            >
              Solana Market Pulse
            </h2>
            <p className="mt-0.5 text-[12px] text-text-secondary">
              Context tape · not trading advice
            </p>
          </div>
          {showStale ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
              Prices delayed
            </span>
          ) : null}
        </div>

        {isLoading && !pulse ? (
          <p className="mt-4 text-[12px] text-text-muted">Loading market context…</p>
        ) : null}

        {noPulse ? (
          <div className="mt-4">
            <p className="text-[12px] text-text-muted">
              Market context is updating. Check back shortly.
            </p>
            {process.env.NODE_ENV !== "production" ? (
              <p className="mt-1 text-[11px] text-text-muted/80">
                Dev: Market Pulse refresh is pending — run local pulse after ingest.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
            Hot tokens from today&apos;s scanner
          </h3>
          <div className="mt-2 flex flex-wrap gap-3">
            {anchor ? (
              <TokenChip row={anchor} prominent linkEnabled={pulse?.dataSource === "live"} />
            ) : null}
            {hotTokens.map((row) => (
              <TokenChip
                key={row.mint}
                row={row}
                linkEnabled={pulse?.dataSource === "live"}
              />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-text-secondary">
            Scanner signals today
            {pulse?.hotTape.length ? (
              <span className="ml-1.5 font-normal normal-case text-text-muted">
                ({pulse.hotTape.length})
              </span>
            ) : null}
          </h3>
          {pulse?.hotTape.length ? (
            <ul className="mt-1.5 grid list-none grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {pulse.hotTape.map((item) => {
                const key = item.mint ?? item.title;
                const tokenHref =
                  pulse.dataSource === "live" &&
                  item.mint &&
                  isValidMintParam(item.mint)
                    ? tokenDetailPath(item.mint)
                    : null;
                const inner = (
                  <div className="flex min-h-0 flex-col gap-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="shrink-0 text-[12px] font-semibold text-text-primary">
                        {item.symbol}
                      </span>
                      <span className="min-w-0 truncate text-[10px] text-text-muted">
                        {item.title}
                      </span>
                    </div>
                    <SignalQualityBadges badges={hotTapeBadges(item)} />
                  </div>
                );

                return (
                  <li
                    key={key}
                    className="rounded-[8px] border border-border bg-bg-card px-2.5 py-1.5 transition-colors hover:border-accent/40"
                  >
                    {tokenHref ? (
                      <Link href={tokenHref} className="block">
                        {inner}
                      </Link>
                    ) : item.canonicalUrl ? (
                      <a
                        href={item.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {inner}
                      </a>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-[12px] text-text-muted">
              No additional DexScreener signals in the last 24h (tokens above may already cover
              today&apos;s scanner activity).
            </p>
          )}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-text-muted">
          Market Pulse shows third-party market context. Not investment advice. Promoted boosts
          are paid visibility, not recommendations.
        </p>
      </div>
    </section>
  );
}
