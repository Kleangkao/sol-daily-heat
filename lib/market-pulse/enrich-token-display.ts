import { isMintLikeLabel } from "@/lib/heat/token-display";
import { solanaTokenLogoUrl } from "@/lib/heat/token-logo";
import type { HotTapeItem, PulseTokenRow } from "@/lib/market-pulse/types";

export type DexTokenMeta = {
  symbol?: string;
  name?: string;
};

const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Fetch base token symbol/name for mints that only have address-like labels. */
export async function fetchDexTokenMeta(
  mints: string[]
): Promise<Map<string, DexTokenMeta>> {
  const valid = Array.from(new Set(mints.filter((m) => MINT_RE.test(m))));
  const out = new Map<string, DexTokenMeta>();
  if (valid.length === 0) return out;

  const batchSize = 8;
  for (let i = 0; i < valid.length; i += batchSize) {
    const batch = valid.slice(i, i + batchSize);
    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${batch.join(",")}`,
        { headers: { Accept: "application/json" }, next: { revalidate: 0 } }
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        pairs?: Array<{
          baseToken?: { address?: string; symbol?: string; name?: string };
        }>;
      };
      for (const pair of data.pairs ?? []) {
        const addr = pair.baseToken?.address;
        if (!addr || out.has(addr)) continue;
        const symbol = pair.baseToken?.symbol?.trim();
        const name = pair.baseToken?.name?.trim();
        if (symbol || name) {
          out.set(addr, { symbol, name });
        }
      }
    } catch {
      /* fail-soft */
    }
  }

  return out;
}

function applyMetaToRow(row: PulseTokenRow, meta: DexTokenMeta | undefined): PulseTokenRow {
  const symbol =
    meta?.symbol && !isMintLikeLabel(meta.symbol)
      ? meta.symbol.replace(/^\$/, "").slice(0, 12)
      : row.symbol;
  return {
    ...row,
    symbol,
    name: meta?.name ?? row.name,
    logoUrl: row.logoUrl ?? solanaTokenLogoUrl(row.mint),
  };
}

export async function enrichPulseTokenRows(rows: PulseTokenRow[]): Promise<PulseTokenRow[]> {
  const needsMeta = rows.filter((r) => r.mint && isMintLikeLabel(r.symbol.trim()));
  const metaByMint = await fetchDexTokenMeta(needsMeta.map((r) => r.mint));

  return rows.map((row) => {
    const withLogo: PulseTokenRow = {
      ...row,
      logoUrl: row.logoUrl ?? (row.mint ? solanaTokenLogoUrl(row.mint) : undefined),
    };
    if (!row.mint || !isMintLikeLabel(row.symbol.trim())) return withLogo;
    return applyMetaToRow(withLogo, metaByMint.get(row.mint));
  });
}

export async function enrichHotTapeItems(items: HotTapeItem[]): Promise<HotTapeItem[]> {
  const needsMeta = items.filter(
    (item) => item.mint && isMintLikeLabel(item.symbol.trim())
  );
  const metaByMint = await fetchDexTokenMeta(
    needsMeta.map((item) => item.mint!).filter(Boolean)
  );

  return items.map((item) => {
    const withLogo: HotTapeItem = {
      ...item,
      logoUrl: item.logoUrl ?? (item.mint ? solanaTokenLogoUrl(item.mint) : undefined),
    };
    if (!item.mint || !isMintLikeLabel(item.symbol.trim())) return withLogo;
    const meta = metaByMint.get(item.mint);
    const symbol =
      meta?.symbol && !isMintLikeLabel(meta.symbol)
        ? meta.symbol.replace(/^\$/, "").slice(0, 12)
        : item.symbol;
    return {
      ...withLogo,
      symbol,
      name: meta?.name ?? item.name,
    };
  });
}
