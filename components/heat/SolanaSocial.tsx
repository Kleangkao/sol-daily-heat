"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  SOLANA_SOCIAL_EVENTS,
  SOLANA_SOCIAL_SUBTITLE,
  SOLANA_SOCIAL_TITLE,
  type SolanaSocialEvent,
} from "@/lib/social/solana-social";

function SocialVisual({ large = false }: { large?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[10px] border border-border/80 bg-bg-secondary ${
        large ? "aspect-[16/10] w-full" : "aspect-[4/3] w-full"
      }`}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "linear-gradient(145deg, rgba(153,69,255,0.25) 0%, rgba(20,241,149,0.18) 45%, rgba(4,22,22,0.95) 100%)",
        }}
      />
      <div className="absolute inset-0 flex items-end p-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Community preview
        </span>
      </div>
    </div>
  );
}

function SocialModal({
  event,
  onClose,
}: {
  event: SolanaSocialEvent;
  onClose: () => void;
}) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-10 max-h-[min(90vh,640px)] w-full max-w-md overflow-y-auto rounded-[14px] border border-border bg-bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                {event.location}
              </p>
              <h3 id={titleId} className="mt-1 font-heading text-[22px] font-bold uppercase text-text-primary">
                {event.name}
              </h3>
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

          <div className="mt-4">
            <SocialVisual large />
          </div>

          <p id={descId} className="mt-4 text-[14px] leading-relaxed text-text-secondary">
            {event.modalDescription}
          </p>

          <div className="mt-5 border-t border-border pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Follow / contact
            </p>
            <ul className="mt-2 space-y-2">
              {event.links.map((link) => (
                <li key={link.label}>
                  {link.href ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-medium text-accent hover:text-accent-hover"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <span className="text-[13px] text-text-muted">
                      {link.label}
                      {link.status === "coming_soon" ? " · coming soon" : ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-[11px] text-text-muted">
            Static v0 preview · not investment advice · not an endorsement
          </p>
        </div>
      </div>
    </div>
  );
}

function SocialCard({
  event,
  onOpen,
}: {
  event: SolanaSocialEvent;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[12px] border border-border bg-bg-card/60 text-left transition-colors hover:border-accent/40 hover:bg-bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
    >
      <SocialVisual />
      <div className="px-3 pb-3 pt-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
          {event.location}
        </p>
        <p className="mt-0.5 font-heading text-[15px] font-bold uppercase text-text-primary">
          {event.name}
        </p>
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-text-secondary">
          {event.tagline}
        </p>
        <p className="mt-2 text-[11px] font-medium text-text-muted">Tap for details</p>
      </div>
    </button>
  );
}

export default function SolanaSocial() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = SOLANA_SOCIAL_EVENTS.find((e) => e.id === activeId) ?? null;

  const close = useCallback(() => setActiveId(null), []);

  return (
    <section aria-labelledby="solana-social-heading" className="rounded-[12px] border border-border bg-bg-secondary/30 p-3">
      <div>
        <h2
          id="solana-social-heading"
          className="editorial-pipe font-heading text-[14px] font-bold uppercase tracking-tight text-text-primary lg:text-[15px]"
        >
          {SOLANA_SOCIAL_TITLE}
        </h2>
        <p className="mt-1 text-[11px] text-text-muted">{SOLANA_SOCIAL_SUBTITLE}</p>
        <p className="mt-0.5 text-[10px] lowercase text-text-muted">v0 preview</p>
      </div>

      <div className="mt-3 space-y-3">
        {SOLANA_SOCIAL_EVENTS.map((event) => (
          <SocialCard key={event.id} event={event} onOpen={() => setActiveId(event.id)} />
        ))}
      </div>

      {active ? <SocialModal event={active} onClose={close} /> : null}
    </section>
  );
}
