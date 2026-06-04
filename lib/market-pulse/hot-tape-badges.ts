import { LOW_LIQUIDITY_USD } from "@/lib/market-pulse/constants";
import type { HotTapeItem } from "@/lib/market-pulse/types";
import type { SignalBadge } from "@/lib/heat/card-display";

export function hotTapeBadges(item: HotTapeItem): SignalBadge[] {
  const badges: SignalBadge[] = [];

  if (item.signal === "boost") {
    badges.push({ id: "boost", label: "Promoted boost", tone: "boost" });
  } else if (item.signal === "new_pair") {
    badges.push({ id: "new-pair", label: "New pair", tone: "market" });
  }

  if (
    item.liquidityUsd != null &&
    item.liquidityUsd < LOW_LIQUIDITY_USD
  ) {
    badges.push({ id: "low-liq", label: "Low liquidity", tone: "caution" });
  }

  badges.push({ id: "market-signal", label: "Market signal only", tone: "market" });

  return badges;
}
