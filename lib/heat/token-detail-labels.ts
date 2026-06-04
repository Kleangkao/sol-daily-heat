import { LOW_LIQUIDITY_USD } from "@/lib/market-pulse/constants";
import type { PulseTokenLabel } from "@/lib/market-pulse/types";

export function isPumpStyleMintOrSymbol(mint: string, symbol: string): boolean {
  const m = mint.toLowerCase();
  const s = symbol.toLowerCase();
  if (m.endsWith("pump")) return true;
  if (s.endsWith("pump") && s.length <= 12) return true;
  return false;
}

export function deriveTokenBadges(input: {
  symbol: string;
  mint: string;
  pulseLabels: PulseTokenLabel[];
  hasBoost: boolean;
  hasNewPair: boolean;
  inTopHeat: boolean;
  inNewTokens: boolean;
  liquidityUsd: number | null;
  isKnownToken?: boolean;
}): PulseTokenLabel[] {
  const seen = new Set<PulseTokenLabel>();
  const add = (l: PulseTokenLabel) => {
    if (!seen.has(l)) {
      seen.add(l);
    }
  };

  for (const l of input.pulseLabels) add(l);

  const pumpStyle = isPumpStyleMintOrSymbol(input.mint, input.symbol);
  if (pumpStyle) {
    add("Pump.fun style");
    add("High risk");
    add("Market signal only");
  }
  if (input.isKnownToken) add("Known token");
  if (input.hasBoost) add("Promoted boost");
  if (input.hasNewPair) add("New pair");
  if (input.inTopHeat) add("Mentioned in Top Heat");
  if (input.inNewTokens) add("In New Tokens Today");
  if (
    input.liquidityUsd != null &&
    input.liquidityUsd < LOW_LIQUIDITY_USD &&
    !seen.has("Low liquidity")
  ) {
    add("Low liquidity");
  }

  return Array.from(seen);
}
