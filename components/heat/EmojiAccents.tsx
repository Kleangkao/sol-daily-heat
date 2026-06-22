/** Animated accent emojis — CSS-only, scoped to Daily Heat + hero lightning. */

export function DailyHeatFireEmoji({ className = "" }: { className?: string }) {
  return (
    <span className={`emoji-accent-fire ${className}`.trim()} aria-hidden>
      🔥
    </span>
  );
}

export function DailyHeatTitle({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      Solana Daily Heat <DailyHeatFireEmoji />
    </span>
  );
}

export function HeroLightningEmoji({ className = "" }: { className?: string }) {
  return (
    <span className={`emoji-accent-lightning ${className}`.trim()} aria-hidden>
      ⚡
    </span>
  );
}
