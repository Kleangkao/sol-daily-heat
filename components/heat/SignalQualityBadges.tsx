"use client";

import type { SignalBadge, SignalBadgeTone } from "@/lib/heat/card-display";

const TONE_CLASS: Record<SignalBadgeTone, string> = {
  official: "border-accent/40 bg-accent/10 text-accent",
  editorial: "border-accent/30 bg-bg-secondary text-text-primary",
  protocol: "border-accent/35 bg-accent/5 text-accent",
  market: "border-heat/40 bg-heat/10 text-heat",
  boost: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  fee: "border-heat/30 bg-heat/5 text-heat",
  caution: "border-danger/30 bg-danger/5 text-danger",
  corroboration: "border-border bg-bg-primary text-text-secondary",
};

type Props = {
  badges: SignalBadge[];
};

export default function SignalQualityBadges({ badges }: Props) {
  if (badges.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge.id}
          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${TONE_CLASS[badge.tone]}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
