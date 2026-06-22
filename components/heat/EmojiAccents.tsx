/** Animated accent emojis — CSS-only, scoped to Daily Heat + hero lightning. */

const accentBase = "emoji-accent";

export function DailyHeatFireEmoji({ className = "" }: { className?: string }) {
  return (
    <span className={`${accentBase} emoji-accent-fire ${className}`.trim()} aria-hidden>
      🔥
    </span>
  );
}

export function DailyHeatTitle({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`.trim()}>
      <span>Solana Daily Heat</span>
      <DailyHeatFireEmoji />
    </span>
  );
}

export function HeroLightningEmoji({ className = "" }: { className?: string }) {
  return (
    <span className={`${accentBase} emoji-accent-lightning ${className}`.trim()} aria-hidden>
      ⚡
    </span>
  );
}
