type JupiterTokenPrice = {
  usdPrice?: number;
  priceChange24h?: number;
  liquidity?: number;
};

export type JupiterPriceResult = {
  ok: boolean;
  byMint: Map<string, { priceUsd: number | null; change24hPct: number | null; liquidityUsd: number | null }>;
  error?: string;
};

export async function fetchJupiterPrices(mintIds: string[]): Promise<JupiterPriceResult> {
  const byMint = new Map<
    string,
    { priceUsd: number | null; change24hPct: number | null; liquidityUsd: number | null }
  >();

  if (mintIds.length === 0) {
    return { ok: true, byMint };
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKey = process.env.JUPITER_API_KEY;
  if (apiKey) headers["x-api-key"] = apiKey;

  try {
    const url = `https://api.jup.ag/price/v3?ids=${mintIds.join(",")}`;
    const res = await fetch(url, { headers, next: { revalidate: 0 } });
    if (!res.ok) {
      return {
        ok: false,
        byMint,
        error: `Jupiter HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as Record<string, JupiterTokenPrice>;
    for (const mint of mintIds) {
      const row = data[mint];
      byMint.set(mint, {
        priceUsd: typeof row?.usdPrice === "number" ? row.usdPrice : null,
        change24hPct:
          typeof row?.priceChange24h === "number" ? row.priceChange24h : null,
        liquidityUsd: typeof row?.liquidity === "number" ? row.liquidity : null,
      });
    }
    return { ok: true, byMint };
  } catch (e) {
    return {
      ok: false,
      byMint,
      error: e instanceof Error ? e.message : "Jupiter fetch failed",
    };
  }
}
