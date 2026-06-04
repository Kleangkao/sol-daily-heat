import type { SignalBadge, SignalBadgeTone } from "@/lib/heat/card-display";
import type { PulseTokenLabel } from "@/lib/market-pulse/types";

const LABEL_TONE: Record<PulseTokenLabel, SignalBadgeTone> = {
  "Ecosystem anchor": "official",
  "Promoted boost": "boost",
  "New pair": "market",
  "Low liquidity": "caution",
  "Mentioned in Top Heat": "editorial",
  "In New Tokens Today": "market",
  "Known token": "corroboration",
  "Pump.fun style": "caution",
  "High risk": "caution",
  "Market signal only": "caution",
};

const PRIMARY_ORDER: PulseTokenLabel[] = [
  "High risk",
  "Pump.fun style",
  "Market signal only",
  "Promoted boost",
  "New pair",
  "Mentioned in Top Heat",
  "In New Tokens Today",
  "Known token",
  "Low liquidity",
  "Ecosystem anchor",
];

export function pulseLabelsToBadges(labels: PulseTokenLabel[]): SignalBadge[] {
  const sorted = [...labels].sort(
    (a, b) => PRIMARY_ORDER.indexOf(a) - PRIMARY_ORDER.indexOf(b)
  );
  return sorted.slice(0, 2).map((label) => ({
    id: label.replace(/\s+/g, "-").toLowerCase(),
    label,
    tone: LABEL_TONE[label],
  }));
}
