"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { DemoCard, DemoCardLayout, DemoSpotlightSection } from "@/lib/demo/spotlight-sections";

function bannerThumbFrameClass(layout: DemoCardLayout) {
  if (layout === "gaming-row") {
    return "aspect-[2.35/1] max-h-[11rem] sm:max-h-[12.5rem]";
  }
  return "aspect-[16/9]";
}

const MODAL_IMAGE_ROUND = "rounded-[6px]";

function bannerObjectClass(card: DemoCard) {
  return card.thumbObjectPosition === "top" ? "object-cover object-top" : "object-cover object-center";
}

function ModalImageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={`overflow-hidden ${MODAL_IMAGE_ROUND} bg-bg-secondary/30`}>{children}</div>
  );
}

function SpotlightImage({
  card,
  layout,
  variant = "thumb",
}: {
  card: DemoCard;
  layout: DemoCardLayout;
  variant?: "thumb" | "modal";
}) {
  if (variant === "modal") {
    return (
      <ModalImageFrame>
        <Image
          src={card.imageSrc}
          alt=""
          width={card.imageWidth}
          height={card.imageHeight}
          unoptimized
          loading="eager"
          className={`mx-auto block max-h-[min(60vh,480px)] w-auto max-w-full object-contain ${MODAL_IMAGE_ROUND}`}
          sizes="(max-width: 640px) calc(100vw - 48px), 480px"
          aria-hidden
        />
      </ModalImageFrame>
    );
  }

  if (layout === "square") {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-[8px] border border-border/80 bg-bg-secondary">
        <Image
          src={card.imageSrc}
          alt=""
          width={card.imageWidth}
          height={card.imageHeight}
          unoptimized
          loading="lazy"
          className="h-full w-full object-cover object-center"
          sizes="(max-width: 768px) 100vw, 50vw"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[8px] border border-border/80 bg-bg-secondary ${bannerThumbFrameClass(layout)}`}
    >
      <Image
        src={card.imageSrc}
        alt=""
        width={card.imageWidth}
        height={card.imageHeight}
        unoptimized
        loading="lazy"
        className={`h-full w-full ${bannerObjectClass(card)}`}
        sizes={layout === "gaming-row" ? "(max-width: 768px) 100vw, 640px" : "(max-width: 768px) 100vw, 50vw"}
        aria-hidden
      />
    </div>
  );
}

function LinkButtons({ links }: { links: DemoCard["links"] }) {
  return (
    <ul className="flex flex-col gap-2">
      {links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center justify-center rounded-[8px] border border-border bg-bg-secondary/50 px-4 py-2.5 text-[13px] font-semibold text-text-primary transition-colors hover:border-accent/50 hover:text-accent"
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function SpotlightModal({
  card,
  section,
  onClose,
}: {
  card: DemoCard;
  section: DemoSpotlightSection;
  onClose: () => void;
}) {
  const titleId = useId();
  const isPortrait = card.imageHeight > card.imageWidth;
  const [mounted, setMounted] = useState(false);

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
        className={`relative z-10 flex max-h-[calc(100vh-48px)] w-full flex-col overflow-hidden rounded-[14px] border border-border bg-bg-card shadow-2xl ${
          isPortrait
            ? "max-w-[min(400px,calc(100vw-24px))]"
            : "max-w-[min(560px,calc(100vw-24px))]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h3
            id={titleId}
            className="min-w-0 font-heading text-[17px] font-bold uppercase text-text-primary sm:text-[18px]"
          >
            {card.name}
          </h3>
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
          <SpotlightImage card={card} layout={section.cardLayout} variant="modal" />
        </div>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 sm:px-5">
          {card.about ? (
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                About
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-text-secondary sm:text-[14px]">
                {card.about}
              </p>
            </div>
          ) : null}
          <LinkButtons links={card.links} />
        </div>

        <p className="shrink-0 border-t border-border px-4 py-2.5 text-[10px] text-text-muted sm:px-5 sm:text-[11px]">
          Demo spotlight · not investment advice · not an endorsement
        </p>
      </div>
    </div>,
    document.body,
  );
}

function SpotlightCard({
  card,
  layout,
  onOpen,
  compact = false,
}: {
  card: DemoCard;
  layout: DemoCardLayout;
  onOpen: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full overflow-hidden rounded-[10px] border border-border bg-bg-card/60 text-left transition-colors hover:border-accent/40 hover:bg-bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
    >
      <SpotlightImage card={card} layout={layout} />
      <div className={`px-3 pb-3 pt-2 ${compact ? "px-2.5 pb-2.5 pt-1.5" : ""}`}>
        <p
          className={`font-semibold uppercase tracking-wide text-accent ${
            compact ? "text-[9px]" : "text-[10px]"
          }`}
        >
          {card.categoryLabel}
        </p>
        <p
          className={`mt-0.5 truncate font-bold text-text-primary ${
            compact ? "text-[13px] sm:text-[14px]" : "text-[14px] sm:text-[15px]"
          }`}
        >
          {card.name}
        </p>
      </div>
    </button>
  );
}

function gridClassForLayout(layout: DemoCardLayout) {
  switch (layout) {
    case "gaming-row":
      return "flex flex-col gap-3";
    case "square":
      return "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3";
    case "banner":
      return "grid grid-cols-1 gap-4 md:grid-cols-2";
  }
}

export default function DemoSpotlightSection({ section }: { section: DemoSpotlightSection }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = section.cards.find((c) => c.id === activeId) ?? null;
  const close = useCallback(() => setActiveId(null), []);
  const headingId = `${section.id}-heading`;

  return (
    <>
      <section
        id={section.id}
        aria-labelledby={headingId}
        className="mt-10 scroll-mt-24 border-t border-border/60 pt-8"
      >
        <div className="mb-4">
          <h2
            id={headingId}
            className="font-heading text-[18px] font-bold uppercase tracking-wide text-text-primary sm:text-[22px]"
          >
            {section.title}
          </h2>
        </div>

        <div className={gridClassForLayout(section.cardLayout)}>
          {section.cards.map((card) => (
            <SpotlightCard
              key={card.id}
              card={card}
              layout={section.cardLayout}
              compact={section.cardLayout === "square"}
              onOpen={() => setActiveId(card.id)}
            />
          ))}
        </div>
      </section>

      {active ? <SpotlightModal card={active} section={section} onClose={close} /> : null}
    </>
  );
}
