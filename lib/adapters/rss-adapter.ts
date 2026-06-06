import Parser from "rss-parser";

import type { SourceAdapter, AdapterContext, RawItemDraft } from "./types";

import { safeText, stripHtml } from "@/lib/text/normalize";

import {

  matchesSolanaFeedFilter,

  sourceRequiresSolanaFilter,

} from "@/lib/text/solana-filter";

import { isWithinHours } from "@/lib/scoring/freshness";

import { isPricePredictionItem } from "@/lib/sources/cointelegraph-shadow-patterns";
import {

  rssIngestCap,

  STATUS_SOURCE_SLUGS,

  RSS_INGEST_FRESHNESS_HOURS,

  rssIngestUsesStaleGuard,

  FILTERED_BROAD_RSS_SKIP_PRICE_PREDICTION_SLUGS,

  isGithubReleaseSourceSlug,

  topicCategoryForSourceSlug,

} from "@/lib/sources/rss-ingest-policy";



const parser = new Parser({ timeout: 15000 });



const FILTER_LOG_SLUGS = new Set([
  "the-block-news",
  "dlnews-rss",
  "decrypt-rss",
  "coindesk-rss",
  "cointelegraph-solana-rss",
  "utoday-rss",
  "thedefiant-rss",
]);



function itemTimestamp(item: Record<string, unknown>): number {

  const pub = safeText(item.isoDate) || safeText(item.pubDate);

  if (!pub) return 0;

  const t = new Date(pub).getTime();

  return Number.isFinite(t) ? t : 0;

}



function shouldSkipRssItem(

  sourceSlug: string,

  published_at: string | undefined

): boolean {

  if (!rssIngestUsesStaleGuard(sourceSlug)) return false;

  if (!published_at) return true;

  return !isWithinHours(published_at, RSS_INGEST_FRESHNESS_HOURS);

}



export class RssAdapter implements SourceAdapter {

  readonly slug = "rss";



  isEnabled(ctx: AdapterContext): boolean {

    return ctx.source.source_type === "rss" && ctx.source.is_enabled && Boolean(ctx.source.feed_url);

  }



  async fetch(ctx: AdapterContext): Promise<RawItemDraft[]> {

    const url = ctx.source.feed_url!;

    const res = await fetch(url, {

      headers: { "User-Agent": "SolDailyHeatScanner/1.0", Accept: "application/rss+xml, application/xml, */*" },

      next: { revalidate: 0 },

    });

    if (!res.ok) return [];



    const xml = await res.text();

    const feed = await parser.parseString(xml);

    const items = (feed.items ?? []) as Array<Record<string, unknown>>;

    const meta = (ctx.source.metadata_json ?? {}) as Record<string, unknown>;

    const maxItems = rssIngestCap(ctx.source.slug, meta);

    const needsFilter = sourceRequiresSolanaFilter(ctx.source.slug, meta);

    const topicCategory = topicCategoryForSourceSlug(ctx.source.slug);

    const isStatus = STATUS_SOURCE_SLUGS.has(ctx.source.slug);
    const isGithubRelease = isGithubReleaseSourceSlug(ctx.source.slug);



    const sorted = [...items].sort((a, b) => itemTimestamp(b) - itemTimestamp(a));

    const scanLimit = needsFilter ? Math.min(sorted.length, 120) : sorted.length;



    let blockFetched = 0;

    let blockPassed = 0;

    let blockRejected = 0;

    let staleSkipped = 0;



    const drafts: RawItemDraft[] = [];

    for (const item of sorted.slice(0, scanLimit)) {

      if (drafts.length >= maxItems) break;



      blockFetched += needsFilter ? 1 : 0;



      const title = safeText(item.title).trim();

      const link = safeText(item.link).trim();

      if (!title || !link) {

        if (needsFilter) blockRejected += 1;

        continue;

      }



      const description =

        safeText(item.contentSnippet) ||

        safeText(item.summary) ||

        stripHtml(safeText(item.content));



      const pub = safeText(item.isoDate) || safeText(item.pubDate) || undefined;

      const published_at = pub ? new Date(pub).toISOString() : undefined;



      if (shouldSkipRssItem(ctx.source.slug, published_at)) {

        staleSkipped += 1;

        if (needsFilter) blockRejected += 1;

        continue;

      }



      if (needsFilter && !matchesSolanaFeedFilter(`${title} ${description}`, ctx.source.slug)) {

        blockRejected += 1;

        continue;

      }

      if (
        FILTERED_BROAD_RSS_SKIP_PRICE_PREDICTION_SLUGS.has(ctx.source.slug) &&
        isPricePredictionItem(title, link)
      ) {
        blockRejected += 1;
        continue;
      }



      if (needsFilter) blockPassed += 1;



      drafts.push({

        external_id: link,

        title,

        snippet: description.trim().slice(0, 8000),

        canonical_url: link,

        published_at,

        item_type: "news",

        metadata_json: {

          feed: ctx.source.slug,

          item_type: "news",

          ...(topicCategory ? { topic_category: topicCategory } : {}),

          ...(isStatus
            ? { source_kind: "status" }
            : isGithubRelease
              ? {
                  source_kind: "github_release",
                  feed_format: meta.feed_format ?? "atom",
                  builder_source: true,
                }
              : { source_kind: "official_editorial" }),

          ...(needsFilter ? { solana_filtered: true } : {}),

        },

      });

    }



    if (needsFilter && FILTER_LOG_SLUGS.has(ctx.source.slug)) {

      console.info(

        `[rss:${ctx.source.slug}] fetched=${blockFetched} passed_filter=${blockPassed} rejected=${blockRejected} stored=${drafts.length}`

      );

    }



    if (
      rssIngestUsesStaleGuard(ctx.source.slug) &&
      (staleSkipped > 0 || isGithubRelease)
    ) {
      console.info(
        `[rss:${ctx.source.slug}] stored=${drafts.length} stale_skipped=${staleSkipped} cap=${maxItems}`
      );
    }



    return drafts;

  }

}


