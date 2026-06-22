"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { solanaGramFont } from "@/lib/fonts/solana-gram-font";
import {
  SOLANA_GRAM_CARDS,
  SOLANA_GRAM_TITLE,
  type SolanaSocialCard,
} from "@/lib/social/solana-social";

const GRAM_LOGO_WIDTH = 320;
const GRAM_LOGO_HEIGHT = 96;

function thumbObjectClass(card: SolanaSocialCard) {
  if (card.thumbObjectPosition === "top") {
    return "object-cover object-center lg:object-top";
  }
  return "object-cover object-center";
}

function SocialImage({
  card,
  variant = "thumb",
  uncropped = false,
}: {
  card: SolanaSocialCard;
  variant?: "thumb" | "modal";
  uncropped?: boolean;
}) {
  if (variant === "modal") {
    return (
      <div className="overflow-hidden rounded-[6px] bg-bg-secondary/30">
        <Image
          src={card.imageSrc}
          alt=""
          width={card.imageWidth}
          height={card.imageHeight}
          unoptimized
          loading="eager"
          className="mx-auto block max-h-[min(60vh,480px)] w-auto max-w-full object-contain rounded-[6px]"
          sizes="(max-width: 640px) calc(100vw - 48px), 480px"
          aria-hidden
        />
      </div>
    );
  }

  const imageClass = uncropped
    ? "h-auto w-full object-contain"
    : `h-full w-full ${thumbObjectClass(card)}`;

  const frameClass = uncropped ? "relative w-full" : "relative aspect-[4/3] w-full";

  return (
    <div className={frameClass}>
      <Image
        src={card.imageSrc}
        alt=""
        width={card.imageWidth}
        height={card.imageHeight}
        unoptimized
        loading="eager"
        className={imageClass}
        sizes={uncropped ? "100vw" : "(max-width: 1024px) 45vw, 240px"}
        aria-hidden
      />
    </div>
  );
}

function FilmStripFrame({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="film-strip-frame">
      <div className="film-strip-sprockets" aria-hidden />
      <div className="film-strip-window">{children}</div>
      <div className="film-strip-sprockets" aria-hidden />
    </div>
  );
}

function SocialModal({
  card,
  onClose,
}: {
  card: SolanaSocialCard;
  onClose: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const [mounted, setMounted] = useState(false);
  const isPortrait = card.imageHeight > card.imageWidth;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={`relative z-10 flex max-h-[calc(100vh-48px)] w-full flex-col overflow-hidden rounded-[14px] border border-border bg-bg-card shadow-2xl ${
          isPortrait
            ? "max-w-[min(400px,calc(100vw-24px))]"
            : "max-w-[min(560px,calc(100vw-24px))]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3
              id={titleId}
              className={`${solanaGramFont.className} text-[17px] font-normal tracking-tight text-text-primary sm:text-[18px]`}
            >
              {SOLANA_GRAM_TITLE}
            </h3>
            <p id={descId} className="mt-0.5 text-[11px] text-text-muted sm:text-[12px]">
              Community photo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-[18px] leading-none text-text-muted transition-colors hover:border-accent/50 hover:text-text-primary"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="shrink-0 px-4 py-3 sm:px-5">
          <SocialImage card={card} variant="modal" />
        </div>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 sm:px-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            People in this image
          </p>
          <ul className="mt-2.5 space-y-2">
            {card.people.map((name) => (
              <li
                key={name}
                className="rounded-[8px] border border-border/80 bg-bg-secondary/40 px-3 py-2"
              >
                <p className="text-[13px] font-semibold text-text-primary">{name}</p>
                <p className="mt-0.5 text-[11px] text-text-muted">Social links coming soon</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="shrink-0 border-t border-border px-4 py-2.5 text-[10px] text-text-muted sm:px-5 sm:text-[11px]">
          Static preview · not investment advice · not an endorsement
        </p>
      </div>
    </div>,
    document.body,
  );
}

function SocialCard({
  card,
  onOpen,
  showTapHint = false,
  uncropped = false,
}: {
  card: SolanaSocialCard;
  onOpen: () => void;
  showTapHint?: boolean;
  uncropped?: boolean;
}) {
  const peopleLabel =
    card.people.length === 1 ? card.people[0] : `${card.people.length} people`;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="film-strip-card text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
    >
      <FilmStripFrame>
        <SocialImage card={card} uncropped={uncropped} />
      </FilmStripFrame>
      <div className="film-strip-caption">
        <p className="truncate text-[11px] font-semibold text-text-primary lg:text-[12px]">
          {peopleLabel}
        </p>
        <p
          className={`mt-0.5 text-[10px] text-text-muted ${showTapHint ? "block" : "hidden lg:block"}`}
        >
          Tap to view
        </p>
      </div>
    </button>
  );
}

function SolanaGramBrand() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {/* TODO: Replace/verify brand font asset before any commercial/public release. */}
      <Image
        src="/brand/solana-gram-logo.png"
        alt=""
        width={GRAM_LOGO_WIDTH}
        height={GRAM_LOGO_HEIGHT}
        className="h-7 w-auto max-w-[42%] shrink-0 object-contain object-left sm:h-8"
        priority
        aria-hidden
      />
      <span
        className={`${solanaGramFont.className} truncate text-[15px] leading-none tracking-tight text-text-primary sm:text-[16px]`}
      >
        {SOLANA_GRAM_TITLE}
      </span>
    </div>
  );
}

export default function SolanaSocial({
  headingId = "solana-gram-heading",
  compact = false,
  feed = false,
}: {
  headingId?: string;
  compact?: boolean;
  /** Mobile feed: full section, uncropped photos, no height cap. */
  feed?: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = SOLANA_GRAM_CARDS.find((c) => c.id === activeId) ?? null;

  const close = useCallback(() => setActiveId(null), []);

  const shellClass = feed
    ? "rail-shell rail-shell-feed"
    : compact
      ? "rail-shell rail-shell-compact"
      : "rail-shell rail-shell-desktop";

  return (
    <>
      <section
        aria-labelledby={headingId}
        className={`${shellClass} rounded-[12px] border border-border bg-bg-secondary/30 p-2.5 sm:p-3`}
      >
        <div className="rail-shell-header shrink-0">
          <h2 id={headingId} className="min-w-0">
            <SolanaGramBrand />
          </h2>
        </div>

        <div className={feed ? "rail-body-open" : "scrollbar-hidden rail-body-scroll"}>
          <div
            className={`grid gap-3 ${feed ? "grid-cols-1" : compact ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-1"}`}
          >
            {SOLANA_GRAM_CARDS.map((card) => (
              <SocialCard
                key={card.id}
                card={card}
                onOpen={() => setActiveId(card.id)}
                showTapHint={feed || compact}
                uncropped={feed}
              />
            ))}
          </div>
        </div>
      </section>

      {active ? <SocialModal card={active} onClose={close} /> : null}
    </>
  );
}
