import type { Source } from "@/lib/types/db";
import { RssAdapter } from "./rss-adapter";
import { ManualAdapter } from "./manual-adapter";
import { DexScreenerAdapter } from "./dexscreener-adapter";
import { DefiLlamaAdapter } from "./defillama-adapter";
import { SitemapAdapter } from "./sitemap-adapter";
import { birdeyeAdapter, heliusAdapter, coingeckoAdapter } from "./optional/stubs";
import type { SourceAdapter, AdapterContext, RawItemDraft, AdapterResult } from "./types";

const adapters: SourceAdapter[] = [
  new RssAdapter(),
  new ManualAdapter(),
  new DexScreenerAdapter(),
  new DefiLlamaAdapter(),
  new SitemapAdapter(),
  birdeyeAdapter,
  heliusAdapter,
  coingeckoAdapter,
];

function pickAdapter(source: Source): SourceAdapter | undefined {
  const ctx: AdapterContext = { source };
  const meta = (source.metadata_json ?? {}) as Record<string, unknown>;
  if (meta.discovery === "sitemap" || source.slug === "solanafloor-sitemap") {
    const sitemap = adapters.find((a) => a.slug === "sitemap");
    if (sitemap?.isEnabled(ctx)) return sitemap;
  }
  return adapters.find((a) => a.isEnabled(ctx));
}

export async function runAllAdapters(sources: Source[]): Promise<{
  drafts: Array<{ source: Source; items: RawItemDraft[] }>;
  results: AdapterResult[];
}> {
  const drafts: Array<{ source: Source; items: RawItemDraft[] }> = [];
  const results: AdapterResult[] = [];

  const settled = await Promise.allSettled(
    sources.map(async (source) => {
      const adapter = pickAdapter(source);
      if (!adapter) {
        return {
          source,
          items: [] as RawItemDraft[],
          result: { slug: source.slug, ok: true, count: 0 },
        };
      }
      try {
        const items = await adapter.fetch({ source });
        return {
          source,
          items,
          result: { slug: source.slug, ok: true, count: items.length },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          source,
          items: [] as RawItemDraft[],
          result: { slug: source.slug, ok: false, count: 0, error: message },
        };
      }
    })
  );

  for (const r of settled) {
    if (r.status === "fulfilled") {
      drafts.push({ source: r.value.source, items: r.value.items });
      results.push(r.value.result);
    } else {
      results.push({
        slug: "unknown",
        ok: false,
        count: 0,
        error: r.reason?.message ?? "Adapter failed",
      });
    }
  }

  return { drafts, results };
}
