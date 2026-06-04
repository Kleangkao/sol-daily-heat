import type { PulseTokenRow } from "@/lib/market-pulse/types";

export type PriceByMint = Map<
  string,
  { priceUsd: number | null; change24hPct: number | null; liquidityUsd: number | null }
>;

export function applyPricesToRow(
  row: PulseTokenRow,
  byMint: PriceByMint
): PulseTokenRow {
  const p = byMint.get(row.mint);
  if (!p) return { ...row, labels: [...row.labels] };
  return {
    ...row,
    labels: [...row.labels],
    priceUsd: p.priceUsd ?? row.priceUsd,
    change24hPct: p.change24hPct ?? row.change24hPct,
    liquidityUsd: p.liquidityUsd ?? row.liquidityUsd,
  };
}

export function applyPricesToSnapshot(
  anchor: PulseTokenRow,
  hotTokens: PulseTokenRow[],
  byMint: PriceByMint
): { anchor: PulseTokenRow; hotTokens: PulseTokenRow[] } {
  return {
    anchor: applyPricesToRow(anchor, byMint),
    hotTokens: hotTokens.map((t) => applyPricesToRow(t, byMint)),
  };
}
