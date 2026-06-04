import type { SourceAdapter, AdapterContext, RawItemDraft } from "./types";
import { isWithinHours } from "@/lib/scoring/freshness";
import {
  SOLANAFLOOR_NEWS_SITEMAP_URL,
  SOLANAFLOOR_SITEMAP_SLUG,
  SITEMAP_DEFAULT_MAX_AGE_HOURS,
  SITEMAP_DEFAULT_MAX_ITEMS,
} from "@/lib/sources/sitemap-ingest-policy";
import {
  isSolanaFloorNewsArticleUrl,
  parseSitemapIndexLocs,
  parseUrlSetXml,
  slugFromSolanaFloorNewsUrl,
  slugToHeadline,
} from "./sitemap-xml";

const USER_AGENT = "SolDailyHeatScanner/1.0 (+sitemap-discovery; report-only-headlines)";

function sitemapMaxItems(meta: Record<string, unknown>): number {
  const n = meta.max_items_per_run;
  if (typeof n === "number" && n > 0) return Math.min(15, Math.max(1, Math.floor(n)));
  return SITEMAP_DEFAULT_MAX_ITEMS;
}

function sitemapMaxAgeHours(meta: Record<string, unknown>): number {
  const n = meta.max_age_hours;
  if (typeof n === "number" && n > 0) return n;
  return SITEMAP_DEFAULT_MAX_AGE_HOURS;
}

async function fetchXml(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/xml, text/xml, */*" },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) return null;
  return res.text();
}

async function resolveNewsSitemapUrl(ctx: AdapterContext): Promise<string> {
  const configured = ctx.source.feed_url?.trim();
  if (configured && configured.includes("news/sitemap")) return configured;

  const indexUrl = configured || "https://solanafloor.com/sitemap.xml";
  const indexXml = await fetchXml(indexUrl);
  if (!indexXml) return SOLANAFLOOR_NEWS_SITEMAP_URL;

  const child = parseSitemapIndexLocs(indexXml).find((u) => u.includes("/news/sitemap"));
  return child ?? SOLANAFLOOR_NEWS_SITEMAP_URL;
}

export class SitemapAdapter implements SourceAdapter {
  readonly slug = "sitemap";

  isEnabled(ctx: AdapterContext): boolean {
    const meta = (ctx.source.metadata_json ?? {}) as Record<string, unknown>;
    const discovery =
      ctx.source.source_type === "sitemap" || meta.discovery === "sitemap";
    return discovery && ctx.source.is_enabled && ctx.source.slug === SOLANAFLOOR_SITEMAP_SLUG;
  }

  async fetch(ctx: AdapterContext): Promise<RawItemDraft[]> {
    if (ctx.source.slug !== SOLANAFLOOR_SITEMAP_SLUG) {
      console.info(`[sitemap:${ctx.source.slug}] unsupported slug — skipped`);
      return [];
    }

    const meta = (ctx.source.metadata_json ?? {}) as Record<string, unknown>;
    const maxItems = sitemapMaxItems(meta);
    const maxAgeHours = sitemapMaxAgeHours(meta);

    const sitemapUrl = await resolveNewsSitemapUrl(ctx);
    const xml = await fetchXml(sitemapUrl);
    if (!xml) {
      console.info(`[sitemap:${ctx.source.slug}] fetch failed url=${sitemapUrl}`);
      return [];
    }

    const parsed = parseUrlSetXml(xml);
    const candidates = parsed
      .filter((e) => isSolanaFloorNewsArticleUrl(e.loc))
      .map((e) => {
        const slug = slugFromSolanaFloorNewsUrl(e.loc)!;
        const published_at = e.lastmod ? new Date(e.lastmod).toISOString() : undefined;
        return { loc: e.loc.trim(), slug, published_at, title: slugToHeadline(slug) };
      })
      .filter((e) => e.published_at && isWithinHours(e.published_at, maxAgeHours));

    candidates.sort(
      (a, b) =>
        new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime()
    );

    const selected = candidates.slice(0, maxItems);
    const drafts: RawItemDraft[] = selected.map((row) => ({
      external_id: row.loc,
      title: row.title,
      snippet: `Headline-only discovery via SolanaFloor public sitemap (lastmod ${row.published_at?.slice(0, 10)}). Full article not ingested.`,
      canonical_url: row.loc,
      published_at: row.published_at,
      item_type: "news",
      metadata_json: {
        feed: ctx.source.slug,
        item_type: "news",
        topic_category: "ecosystem",
        source_kind: "headline_only",
        sitemap_discovery: true,
        sitemap_url: sitemapUrl,
        url_slug: row.slug,
      },
    }));

    console.info(
      `[sitemap:${ctx.source.slug}] url=${sitemapUrl} parsed=${parsed.length} fresh_${maxAgeHours}h=${candidates.length} stored=${drafts.length} cap=${maxItems}`
    );

    return drafts;
  }
}
