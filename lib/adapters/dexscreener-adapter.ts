import type { SourceAdapter, AdapterContext, RawItemDraft } from "./types";

type DexPair = {
  chainId?: string;
  pairAddress?: string;
  baseToken?: { symbol?: string; name?: string; address?: string };
  quoteToken?: { symbol?: string };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  pairCreatedAt?: number;
  url?: string;
};

export class DexScreenerAdapter implements SourceAdapter {
  readonly slug = "dexscreener";

  isEnabled(ctx: AdapterContext): boolean {
    return ctx.source.source_type === "dexscreener" && ctx.source.is_enabled;
  }

  async fetch(ctx: AdapterContext): Promise<RawItemDraft[]> {
    const drafts: RawItemDraft[] = [];

    try {
      const boostsRes = await fetch("https://api.dexscreener.com/token-boosts/top/v1", {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      });
      if (boostsRes.ok) {
        const boosts = (await boostsRes.json()) as Array<{
          chainId?: string;
          tokenAddress?: string;
          url?: string;
        }>;
        for (const b of boosts.filter((x) => x.chainId === "solana").slice(0, 15)) {
          const addr = b.tokenAddress ?? "";
          const short =
            addr.length >= 12 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr || "unknown";
          drafts.push({
            external_id: `boost-${addr}`,
            title: `DexScreener boost: ${short}`,
            snippet: `Solana token ${short} on DexScreener paid boost leaderboard.`,
            canonical_url: b.url ?? `https://dexscreener.com/solana/${addr}`,
            published_at: new Date().toISOString(),
            item_type: "market",
            metadata_json: {
              chain: "solana",
              tokenAddress: addr,
              mint: addr,
              signal: "boost",
            },
          });
        }
      }
    } catch {
      /* fail-soft */
    }

    try {
      const searchRes = await fetch(
        "https://api.dexscreener.com/latest/dex/search?q=solana",
        { headers: { Accept: "application/json" }, next: { revalidate: 0 } }
      );
      if (searchRes.ok) {
        const data = (await searchRes.json()) as { pairs?: DexPair[] };
        const pairs = (data.pairs ?? []).filter((p) => p.chainId === "solana");
        const dayAgo = Date.now() - 24 * 3600000;

        for (const p of pairs.slice(0, 20)) {
          const created = p.pairCreatedAt ?? 0;
          if (created < dayAgo) continue;
          const sym = p.baseToken?.symbol ?? "UNKNOWN";
          drafts.push({
            external_id: p.pairAddress ?? sym,
            title: `New pair: ${sym}/${p.quoteToken?.symbol ?? "SOL"}`,
            snippet: `24h vol $${Math.round(p.volume?.h24 ?? 0).toLocaleString()} · liq $${Math.round(p.liquidity?.usd ?? 0).toLocaleString()}`,
            canonical_url: p.url ?? `https://dexscreener.com/solana/${p.pairAddress}`,
            published_at: new Date(created).toISOString(),
            item_type: "market",
            metadata_json: {
              symbol: sym,
              mint: p.baseToken?.address,
              volume_h24: p.volume?.h24,
              liquidity_usd: p.liquidity?.usd,
              signal: "new_pair",
            },
          });
        }
      }
    } catch {
      /* fail-soft */
    }

    return drafts;
  }
}
