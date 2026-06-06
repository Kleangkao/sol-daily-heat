import type { SourceAdapter, AdapterContext, RawItemDraft } from "./types";
import { utcMetricDayStartIso } from "@/lib/heat/story-timestamp";
import {
  evaluateChainFees,
  evaluateProtocolFees,
} from "@/lib/scoring/fees-scoring";

type LlamaProtocol = {
  slug?: string;
  name?: string;
  chain?: string;
  chains?: string[];
  tvl?: number;
  change_1d?: number;
  category?: string;
  url?: string;
};

type FeesProtocol = {
  name?: string;
  displayName?: string;
  module?: string;
  category?: string;
  change_1d?: number;
  total24h?: number;
  defillamaId?: string;
};

export class DefiLlamaAdapter implements SourceAdapter {
  readonly slug = "defillama";

  isEnabled(ctx: AdapterContext): boolean {
    return ctx.source.source_type === "defillama" && ctx.source.is_enabled;
  }

  async fetch(ctx: AdapterContext): Promise<RawItemDraft[]> {
    if (ctx.source.slug === "defillama-fees-solana") {
      return this.fetchFeesSolana(ctx);
    }
    if (ctx.source.slug === "defillama-solana") {
      return this.fetchTvlSolana();
    }
    return [];
  }

  private async fetchFeesSolana(ctx: AdapterContext): Promise<RawItemDraft[]> {
    const drafts: RawItemDraft[] = [];
    const url =
      ctx.source.feed_url ?? "https://api.llama.fi/overview/fees/solana?excludeTotalDataChart=true";

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      });
      if (!res.ok) return drafts;

      const data = (await res.json()) as {
        protocols?: FeesProtocol[];
        change_1d?: number;
        total24h?: number;
      };

      const chainEval = evaluateChainFees(data.total24h, data.change_1d);
      if (chainEval.ingest) {
        const change = chainEval.scoredChangePct;
        drafts.push({
          external_id: "solana-chain-fees",
          title: `Solana chain fees ${change >= 0 ? "+" : ""}${change.toFixed(1)}% (24h)`,
          snippet: `Aggregate Solana fees 24h ~$${Math.round((data.total24h ?? 0) / 1e6)}M`,
          canonical_url: "https://defillama.com/fees/chain/solana",
          published_at: utcMetricDayStartIso(),
          item_type: "protocol",
          metadata_json: {
            signal: "chain_fees",
            metric_window: "24h",
            change_1d: change,
            change_1d_raw: data.change_1d,
            total24h: data.total24h,
            fee_threshold_passed: true,
            fee_priority: chainEval.feePriority,
          },
        });
      }

      const eligible = (data.protocols ?? [])
        .map((p) => {
          const evalResult = evaluateProtocolFees(p.total24h, p.change_1d);
          return { p, evalResult };
        })
        .filter(({ evalResult }) => evalResult.ingest)
        .sort((a, b) => b.evalResult.feePriority - a.evalResult.feePriority)
        .slice(0, 8);

      for (const { p, evalResult } of eligible) {
        const change = evalResult.scoredChangePct;
        const direction = change >= 0 ? "up" : "down";
        const name = p.displayName ?? p.name ?? "Protocol";
        const id = p.module ?? p.name ?? name;
        drafts.push({
          external_id: `fees-${id}`,
          title: `${name}: fees ${direction} ${Math.abs(change).toFixed(1)}% (24h)`,
          snippet: `${name} 24h fees ~$${Math.round((p.total24h ?? 0) / 1e3)}K (${p.category ?? "DeFi"}) · 24h ${direction} ${Math.abs(change).toFixed(1)}%`,
          canonical_url: `https://defillama.com/fees/${id}`,
          published_at: utcMetricDayStartIso(),
          item_type: "protocol",
          metadata_json: {
            metric_window: "24h",
            defillama_id: id,
            change_1d: change,
            change_1d_raw: p.change_1d,
            total24h: p.total24h,
            category: p.category,
            signal: "fees_move",
            fee_threshold_passed: true,
            fee_small_base_discount: evalResult.feeSmallBaseDiscount || undefined,
            fee_priority: evalResult.feePriority,
          },
        });
      }
    } catch {
      /* fail-soft */
    }

    return drafts;
  }

  private async fetchTvlSolana(): Promise<RawItemDraft[]> {
    const drafts: RawItemDraft[] = [];

    try {
      const res = await fetch("https://api.llama.fi/protocols", {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      });
      if (!res.ok) return drafts;

      const protocols = (await res.json()) as LlamaProtocol[];
      const solana = protocols.filter(
        (p) =>
          p.chain === "Solana" ||
          (Array.isArray(p.chains) && p.chains.includes("Solana"))
      );

      const movers = solana
        .filter((p) => typeof p.change_1d === "number" && Math.abs(p.change_1d) >= 5)
        .sort((a, b) => Math.abs(b.change_1d ?? 0) - Math.abs(a.change_1d ?? 0))
        .slice(0, 12);

      for (const p of movers) {
        const change = p.change_1d ?? 0;
        const direction = change >= 0 ? "up" : "down";
        drafts.push({
          external_id: p.slug ?? p.name,
          title: `${p.name}: TVL ${direction} ${Math.abs(change).toFixed(1)}% (24h)`,
          snippet: `${p.name} TVL ~$${Math.round((p.tvl ?? 0) / 1e6)}M (${p.category ?? "DeFi"}) · 24h ${direction} ${Math.abs(change).toFixed(1)}%`,
          canonical_url: p.url ?? `https://defillama.com/protocol/${p.slug}`,
          published_at: utcMetricDayStartIso(),
          item_type: "protocol",
          metadata_json: {
            metric_window: "24h",
            defillama_id: p.slug,
            tvl: p.tvl,
            change_1d: change,
            category: p.category,
            signal: "tvl_move",
          },
        });
      }
    } catch {
      /* fail-soft */
    }

    try {
      const chainRes = await fetch("https://api.llama.fi/v2/chains", {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      });
      if (chainRes.ok) {
        const chains = (await chainRes.json()) as Array<{
          name?: string;
          tvl?: number;
          change_1d?: number;
        }>;
        const sol = chains.find((c) => c.name === "Solana");
        if (sol && typeof sol.change_1d === "number") {
          drafts.push({
            external_id: "solana-chain-tvl",
            title: `Solana chain TVL ${sol.change_1d >= 0 ? "+" : ""}${sol.change_1d.toFixed(1)}% (24h)`,
            snippet: `Aggregate chain TVL ~$${Math.round((sol.tvl ?? 0) / 1e9)}B`,
            canonical_url: "https://defillama.com/chain/solana",
            published_at: utcMetricDayStartIso(),
            item_type: "protocol",
            metadata_json: {
              signal: "chain_tvl",
              metric_window: "24h",
              change_1d: sol.change_1d,
              tvl: sol.tvl,
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
