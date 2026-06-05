/**
 * Shadow evaluation for Cointelegraph Solana tag RSS.
 * Read-only by default — does NOT write to Supabase.
 *
 * Run: npx tsx scripts/shadow-cointelegraph-solana.ts
 */
import "./load-env-local";
import Parser from "rss-parser";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { inferCategory } from "../lib/process/rule-summary";
import {
  classifyCointelegraphNoise,
  type CointelegraphNoiseClass,
} from "../lib/sources/cointelegraph-shadow-patterns";
import {
  COINTELEGRAPH_SOLANA_SHADOW,
  SHADOW_OVERLAP_SOURCE_SLUGS,
} from "../lib/sources/shadow-source-config";
import { matchesSolanaFeedFilter } from "../lib/text/solana-filter";
import { normalizeClusteringKey, stripHtml, safeText } from "../lib/text/normalize";
import type { TopicCategory } from "../lib/types/db";

const DRY_RUN = true;
const MAX_ITEMS = COINTELEGRAPH_SOLANA_SHADOW.metadata_json.max_items_per_run as number;

type FeedItem = {
  title: string;
  url: string;
  publishedAt: string | null;
  ageDays: number | null;
  description: string;
};

type AcceptedItem = FeedItem & {
  category: TopicCategory;
  noiseClass: CointelegraphNoiseClass;
};

type OverlapRow = {
  title: string;
  canonical_url: string | null;
  slug: string;
  clusterKey: string;
  urlKey: string;
};

function daysSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 86400000;
}

function urlKey(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.toString().toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function itemText(item: Record<string, unknown>): string {
  const title = safeText(item.title);
  const summary = safeText(item.contentSnippet) || safeText(item.summary);
  const content = stripHtml(safeText(item.content));
  return `${title} ${summary || content}`.trim();
}

async function fetchFeedItems(feedUrl: string): Promise<FeedItem[]> {
  const parser = new Parser({ timeout: 20000 });
  const feed = await parser.parseURL(feedUrl);
  const raw = (feed.items ?? []) as Array<Record<string, unknown>>;

  return raw
    .map((item) => {
      const title = safeText(item.title).trim();
      const url = safeText(item.link).trim();
      const pub = safeText(item.isoDate) || safeText(item.pubDate) || null;
      const description = stripHtml(
        safeText(item.contentSnippet) ||
          safeText(item.summary) ||
          safeText(item.content)
      ).slice(0, 500);
      return {
        title,
        url,
        publishedAt: pub,
        ageDays: daysSince(pub ?? undefined),
        description,
      };
    })
    .filter((i) => i.title && i.url)
    .sort((a, b) => (b.ageDays ?? 999) - (a.ageDays ?? 999));
}

async function loadOverlapIndex(): Promise<{
  rows: OverlapRow[];
  available: boolean;
}> {
  const db = getSupabaseAdmin();
  if (!db) {
    return { rows: [], available: false };
  }

  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: sources } = await db
    .from("sources")
    .select("id,slug")
    .in("slug", [...SHADOW_OVERLAP_SOURCE_SLUGS]);

  if (!sources?.length) {
    return { rows: [], available: false };
  }

  const idToSlug = new Map(sources.map((s) => [s.id as string, s.slug as string]));
  const sourceIds = sources.map((s) => s.id as string);

  const { data: items, error } = await db
    .from("raw_items")
    .select("title,canonical_url,source_id,published_at")
    .in("source_id", sourceIds)
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false })
    .limit(500);

  if (error || !items) {
    return { rows: [], available: false };
  }

  const rows: OverlapRow[] = items.map((row) => {
    const title = (row.title as string) ?? "";
    const canonical_url = (row.canonical_url as string | null) ?? null;
    const slug = idToSlug.get(row.source_id as string) ?? "unknown";
    return {
      title,
      canonical_url,
      slug,
      clusterKey: normalizeClusteringKey(title),
      urlKey: canonical_url ? urlKey(canonical_url) : "",
    };
  });

  return { rows, available: true };
}

function findOverlap(
  item: AcceptedItem,
  index: OverlapRow[]
): { type: "url" | "title"; slug: string; title: string } | null {
  const u = urlKey(item.url);
  const ck = normalizeClusteringKey(item.title);

  for (const row of index) {
    if (row.urlKey && row.urlKey === u) {
      return { type: "url", slug: row.slug, title: row.title };
    }
  }
  for (const row of index) {
    if (ck.length >= 8 && row.clusterKey === ck) {
      return { type: "title", slug: row.slug, title: row.title };
    }
  }
  return null;
}

type ShadowRecommendation = "add_now" | "keep_shadow" | "reject";

function deriveRecommendation(stats: {
  accepted7d: number;
  accepted30d: number;
  pricePredictionShare: number;
  genericMarketShare: number;
  overlapShare: number;
  uniqueEditorial7d: number;
}): { recommendation: ShadowRecommendation; reason: string } {
  if (stats.accepted7d === 0 && stats.accepted30d < 3) {
    return {
      recommendation: "reject",
      reason: "Insufficient accepted volume after Solana filter.",
    };
  }
  if (stats.pricePredictionShare >= 0.45) {
    return {
      recommendation: "keep_shadow",
      reason: "High price-prediction / market-template share — monitor noise before production.",
    };
  }
  if (stats.overlapShare >= 0.5 && stats.uniqueEditorial7d <= 1) {
    return {
      recommendation: "keep_shadow",
      reason: "Most accepted items overlap existing editorial sources; low incremental value.",
    };
  }
  if (stats.uniqueEditorial7d >= 2 && stats.pricePredictionShare < 0.35) {
    return {
      recommendation: "add_now",
      reason: "Meaningful unique Solana editorial yield with acceptable noise — ready for enabled shadow ingest row.",
    };
  }
  return {
    recommendation: "keep_shadow",
    reason: "Feed works but volume/noise/overlap profile needs more observation windows.",
  };
}

async function main() {
  const cfg = COINTELEGRAPH_SOLANA_SHADOW;
  console.log("Cointelegraph Solana RSS — shadow test");
  console.log(`Run at: ${new Date().toISOString()}`);
  console.log(`DRY_RUN (no Supabase writes): ${DRY_RUN}`);
  console.log(`Source: ${cfg.slug}`);
  console.log(`Feed: ${cfg.feed_url}`);
  console.log(`Cap/run: ${MAX_ITEMS} | requires_solana_filter: true | is_enabled: ${cfg.is_enabled}`);
  console.log("");

  const feedItems = await fetchFeedItems(cfg.feed_url);
  console.log(`Feed items fetched: ${feedItems.length}`);

  const rejected: { item: FeedItem; reason: string }[] = [];
  const accepted: AcceptedItem[] = [];

  for (const item of feedItems) {
    const text = `${item.title} ${item.description}`;
    if (!matchesSolanaFeedFilter(text, cfg.slug)) {
      rejected.push({ item, reason: "solana_filter" });
      continue;
    }
    const noiseClass = classifyCointelegraphNoise(item.title, item.url);
    accepted.push({
      ...item,
      category: inferCategory(text, ["news"]),
      noiseClass,
    });
  }

  const capped = accepted.slice(0, MAX_ITEMS);
  const in7d = (d: number | null) => d != null && d >= 0 && d <= 7;
  const in30d = (d: number | null) => d != null && d >= 0 && d <= 30;

  const accepted7d = accepted.filter((i) => in7d(i.ageDays));
  const accepted30d = accepted.filter((i) => in30d(i.ageDays));

  console.log(`Accepted (Solana filter): ${accepted.length}`);
  console.log(`Rejected (Solana filter): ${rejected.length}`);
  console.log(`Accepted 7d / 30d: ${accepted7d.length} / ${accepted30d.length}`);
  console.log(`Would store (cap ${MAX_ITEMS}): ${capped.length}`);

  const noiseCounts: Record<CointelegraphNoiseClass, number> = {
    editorial: 0,
    price_prediction: 0,
    generic_market: 0,
    other: 0,
  };
  for (const a of accepted) noiseCounts[a.noiseClass] += 1;

  console.log("\nNoise classification (accepted items):");
  for (const [k, v] of Object.entries(noiseCounts)) {
    console.log(`  ${k}: ${v}`);
  }

  const categoryCounts = new Map<TopicCategory, number>();
  for (const a of accepted) {
    categoryCounts.set(a.category, (categoryCounts.get(a.category) ?? 0) + 1);
  }
  console.log("\nInferred categories (accepted):");
  for (const [cat, n] of Array.from(categoryCounts.entries())) {
    console.log(`  ${cat}: ${n}`);
  }

  const overlapIndex = await loadOverlapIndex();
  const overlaps: {
    item: AcceptedItem;
    match: { type: "url" | "title"; slug: string; title: string };
  }[] = [];
  const uniqueEditorial: AcceptedItem[] = [];

  if (overlapIndex.available) {
    for (const item of accepted) {
      const match = findOverlap(item, overlapIndex.rows);
      if (match) overlaps.push({ item, match });
      else if (item.noiseClass === "editorial" || item.noiseClass === "other") {
        uniqueEditorial.push(item);
      }
    }
    console.log(`\nOverlap index: ${overlapIndex.rows.length} rows from ${SHADOW_OVERLAP_SOURCE_SLUGS.join(", ")} (30d)`);
    console.log(`Overlapping accepted items: ${overlaps.length} / ${accepted.length}`);
    console.log(`Unique editorial-ish accepted: ${uniqueEditorial.length}`);
  } else {
    console.log("\nOverlap index: unavailable (no Supabase credentials or no rows) — skipped");
  }

  const uniqueEditorial7d = uniqueEditorial.filter((i) => in7d(i.ageDays)).length;
  const pricePredictionShare =
    accepted.length > 0 ? noiseCounts.price_prediction / accepted.length : 0;
  const genericMarketShare =
    accepted.length > 0 ? noiseCounts.generic_market / accepted.length : 0;
  const overlapShare = accepted.length > 0 ? overlaps.length / accepted.length : 0;

  const { recommendation, reason } = deriveRecommendation({
    accepted7d: accepted7d.length,
    accepted30d: accepted30d.length,
    pricePredictionShare,
    genericMarketShare,
    overlapShare,
    uniqueEditorial7d,
  });

  console.log("\n--- Top accepted titles (up to 10) ---");
  for (const a of accepted.slice(0, 10)) {
    const overlap = overlapIndex.available ? findOverlap(a, overlapIndex.rows) : null;
    const flags = [a.noiseClass, a.category, overlap ? `overlap:${overlap.slug}` : "unique"].join(
      " · "
    );
    console.log(`+ [${flags}] ${a.title}`);
    console.log(`  ${a.url}`);
  }

  console.log("\n--- Rejected examples (up to 5) ---");
  for (const r of rejected.slice(0, 5)) {
    console.log(`- (${r.reason}) ${r.item.title}`);
  }

  if (overlaps.length > 0) {
    console.log("\n--- Overlap examples (up to 5) ---");
    for (const o of overlaps.slice(0, 5)) {
      console.log(`~ ${o.item.title}`);
      console.log(`  cointelegraph: ${o.item.url}`);
      console.log(`  matches ${o.match.slug} via ${o.match.type}: ${o.match.title}`);
    }
  }

  console.log("\n--- Recommendation ---");
  console.log(`${recommendation} — ${reason}`);
  console.log(
    JSON.stringify(
      {
        slug: cfg.slug,
        dryRun: DRY_RUN,
        feedItems: feedItems.length,
        accepted: accepted.length,
        rejected: rejected.length,
        accepted7d: accepted7d.length,
        accepted30d: accepted30d.length,
        noiseCounts,
        pricePredictionShare: Number(pricePredictionShare.toFixed(2)),
        genericMarketShare: Number(genericMarketShare.toFixed(2)),
        overlapShare: overlapIndex.available ? Number(overlapShare.toFixed(2)) : null,
        uniqueEditorial7d,
        recommendation,
        reason,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
