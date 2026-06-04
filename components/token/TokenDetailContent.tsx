import Link from "next/link";
import CopyMintButton from "@/components/token/CopyMintButton";
import SignalQualityBadges from "@/components/heat/SignalQualityBadges";
import { pulseLabelsToBadges } from "@/lib/market-pulse/pulse-label-badges";
import {
  changeTone,
  formatChange24h,
  formatPriceUsd,
} from "@/lib/market-pulse/format";
import { snapshotFreshnessFromFetchedAt } from "@/lib/market-pulse/snapshot-freshness";
import { CATEGORY_LABELS } from "@/lib/types/heat";
import { topicDetailPath } from "@/lib/heat/topic-link";
import type { TokenDetailView } from "@/lib/types/token-detail";

const CHANGE_CLASS = {
  up: "text-emerald-400",
  down: "text-rose-400",
  flat: "text-text-muted",
} as const;

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

function formatUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

type Props = {
  token: TokenDetailView;
};

export default function TokenDetailContent({ token }: Props) {
  const badgeDisplay = pulseLabelsToBadges(token.badges);
  const snap = token.marketSnapshot;
  const snapshotFreshness = snap ? snapshotFreshnessFromFetchedAt(snap.fetchedAt) : null;

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
                Token context
              </p>
              <h1 className="mt-2 font-heading text-[28px] font-bold leading-tight text-text-primary sm:text-[34px]">
                ${token.symbol}
                {token.name ? (
                  <span className="ml-2 text-[18px] font-normal text-text-secondary">
                    {token.name}
                  </span>
                ) : null}
              </h1>
            </div>
          </div>
          {badgeDisplay.length > 0 ? (
            <div className="mt-3">
              <SignalQualityBadges badges={badgeDisplay} />
            </div>
          ) : null}
          <CopyMintButton mint={token.mint} />
          {token.firstSeenAt ? (
            <p className="mt-3 text-[12px] text-text-muted">
              First seen in scanner {formatTime(token.firstSeenAt)}
            </p>
          ) : null}
          <p className="mt-2 text-[12px] italic text-text-muted">
            Token context only — not investment advice.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[10px] border border-border bg-bg-card p-5">
          <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
            Market snapshot
          </h2>
          {snap ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[8px] border border-border/50 bg-bg-secondary/40 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase text-text-muted">Price</p>
                <p className="mt-1 font-heading text-[20px] font-bold text-text-primary">
                  {formatPriceUsd(snap.priceUsd)}
                </p>
                <p
                  className={`mt-0.5 text-[12px] font-medium ${CHANGE_CLASS[changeTone(snap.change24hPct)]}`}
                >
                  {formatChange24h(snap.change24hPct)} <span className="text-text-muted">24h</span>
                </p>
              </div>
              <div className="rounded-[8px] border border-border/50 bg-bg-secondary/40 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase text-text-muted">Liquidity</p>
                <p className="mt-1 text-[16px] font-semibold text-text-primary">
                  {formatUsd(snap.liquidityUsd)}
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase text-text-muted">
                  Volume 24h
                </p>
                <p className="mt-0.5 text-[14px] text-text-primary">{formatUsd(snap.volumeH24)}</p>
              </div>
              <div className="sm:col-span-2">
                <p
                  className={`text-[12px] font-medium ${
                    snapshotFreshness?.stale ? "text-amber-200/90" : "text-text-secondary"
                  }`}
                >
                  {snapshotFreshness?.headline}
                </p>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  {snapshotFreshness?.detail} · {snap.source.replace("_", " ")}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-text-secondary">
              No stored market snapshot for this token yet.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-[10px] border border-border bg-bg-card p-5">
          <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
            Scanner context
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-text-primary">
            {token.scannerContext.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {token.dexScreenerUrl ? (
            <p className="mt-4 text-[12px]">
              <a
                href={token.dexScreenerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                View on DexScreener →
              </a>
            </p>
          ) : null}
        </section>

        {token.relatedTopics.length > 0 ? (
          <section className="mt-6 rounded-[10px] border border-border bg-bg-card p-5">
            <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
              Related topics
            </h2>
            <ul className="mt-3 space-y-3">
              {token.relatedTopics.map((topic) => (
                <li
                  key={topic.id}
                  className="rounded-[8px] border border-border/50 bg-bg-secondary/40 px-3 py-2.5"
                >
                  <Link
                    href={topicDetailPath(topic.id)}
                    className="text-[14px] font-semibold text-accent hover:text-accent-hover"
                  >
                    {topic.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-text-secondary">
                    <span>{CATEGORY_LABELS[topic.category]}</span>
                    <span>·</span>
                    <span className="font-mono text-heat">{topic.heatScore} heat</span>
                    <span>·</span>
                    <span>{topic.rankingDate}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {topic.sections.map((s) => (
                      <span
                        key={`${topic.id}-${s.section}`}
                        className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] text-text-muted"
                      >
                        {s.sectionLabel}
                        {s.rankPosition != null ? ` #${s.rankPosition}` : ""}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={topicDetailPath(topic.id)}
                    className="mt-2 inline-flex text-[12px] font-semibold text-accent hover:text-accent-hover"
                  >
                    View related topic →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {token.timeline.length > 0 ? (
          <section className="mt-6 rounded-[10px] border border-border bg-bg-card p-5">
            <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
              Discovery timeline
            </h2>
            {token.uniqueSourceCount > 1 ? (
              <p className="mt-1 text-[12px] text-text-muted">
                Multiple sources contributed signals for this mint.
              </p>
            ) : null}
            <ul className="mt-3 space-y-2">
              {token.timeline.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-[8px] border border-border/50 bg-bg-secondary/40 px-3 py-2.5 text-[13px]"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-text-secondary">{entry.sourceName}</span>
                    {entry.signal ? (
                      <span className="rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase text-text-muted">
                        {entry.signal}
                      </span>
                    ) : null}
                    <span className="text-[11px] text-text-muted">
                      {formatTime(entry.publishedAt ?? entry.fetchedAt)}
                    </span>
                  </div>
                  {entry.url ? (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-text-primary hover:text-accent"
                    >
                      {entry.title}
                    </a>
                  ) : (
                    <p className="mt-1 text-text-primary">{entry.title}</p>
                  )}
                  {entry.itemType ? (
                    <p className="mt-0.5 text-[11px] text-text-muted">Type: {entry.itemType}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-6 rounded-[10px] border border-border bg-bg-card p-5">
          <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
            Risk & context
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[13px] leading-relaxed text-text-secondary">
            {token.riskNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        {token.protocols.length > 0 ? (
          <section className="mt-6 rounded-[10px] border border-border bg-bg-card p-5">
            <h2 className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary">
              Related protocols
            </h2>
            <ul className="mt-3 space-y-2">
              {token.protocols.map((p) => (
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
          </section>
        ) : null}
      </main>
    </div>
  );
}
