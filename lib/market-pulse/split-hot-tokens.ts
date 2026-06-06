import type { PulseTokenRow } from "@/lib/market-pulse/types";

const RISK_LABELS = new Set([
  "Promoted boost",
  "High risk",
  "Pump.fun style",
  "Low liquidity",
]);

export type SplitHotTokensResult = {
  gainers: PulseTokenRow[];
  droppers: PulseTokenRow[];
  highRisk: PulseTokenRow[];
  /** Mints already assigned to a visible section. */
  usedMints: Set<string>;
};

function claimUnique(
  rows: PulseTokenRow[],
  used: Set<string>,
  limit: number
): PulseTokenRow[] {
  const out: PulseTokenRow[] = [];
  for (const row of rows) {
    if (!row.mint || used.has(row.mint)) continue;
    used.add(row.mint);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Split watchlist hot tokens into rail sections without repeating the same mint.
 * Movers/droppers win over high-risk when a token qualifies for both.
 */
export function splitHotTokens(tokens: PulseTokenRow[]): SplitHotTokensResult {
  const usedMints = new Set<string>();
  const withChange = tokens.filter((t) => t.change24hPct != null);

  const gainers = claimUnique(
    [...withChange]
      .filter((t) => (t.change24hPct ?? 0) > 0)
      .sort((a, b) => (b.change24hPct ?? 0) - (a.change24hPct ?? 0)),
    usedMints,
    3
  );

  const droppers = claimUnique(
    [...withChange]
      .filter((t) => (t.change24hPct ?? 0) < 0)
      .sort((a, b) => (a.change24hPct ?? 0) - (b.change24hPct ?? 0)),
    usedMints,
    2
  );

  const highRisk = claimUnique(
    tokens
      .filter((t) => t.labels.some((l) => RISK_LABELS.has(l)))
      .sort((a, b) => riskSortScore(b) - riskSortScore(a)),
    usedMints,
    3
  );

  return { gainers, droppers, highRisk, usedMints };
}

/** Prefer risk-first stories (not already a top mover/dropper candidate). */
function riskSortScore(row: PulseTokenRow): number {
  let score = 0;
  if (row.labels.includes("High risk")) score += 4;
  if (row.labels.includes("Pump.fun style")) score += 3;
  if (row.labels.includes("Promoted boost")) score += 2;
  if (row.labels.includes("Low liquidity")) score += 1;
  const chg = row.change24hPct;
  if (chg == null || Math.abs(chg) < 1) score += 2;
  return score;
}
