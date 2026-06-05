/**
 * Broad RSS shadow benchmark — read-only, no Supabase writes.
 * Run: npx tsx scripts/shadow-broad-rss-bench.ts
 */
import "./load-env-local";
import Parser from "rss-parser";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import {
  classifyBroadRssNoise,
  noiseRatio,
  type BroadRssNoiseClass,
} from "../lib/sources/broad-rss-noise";
import {
  loadShadowSources,
  type ShadowSourceRow,
} from "../lib/sources/load-shadow-sources";
import { SHADOW_OVERLAP_SOURCE_SLUGS } from "../lib/sources/shadow-source-config";
import { matchesSolanaFeedFilter } from "../lib/text/solana-filter";
import { normalizeClusteringKey, safeText, stripHtml } from "../lib/text/normalize";

const DRY_RUN = true;
const UA = "SolDaily-RSS-ShadowBench/1.0";

type FeedItem = {
  title: string;
  url: string;
  publishedAt: string | null;
  ageDays: number | null;
  description: string;
};

type AcceptedItem = FeedItem & { noiseClass: BroadRssNoiseClass };

type BenchResult = {
  source: ShadowSourceRow;
  status: "ok" | "fetch_failed" | "parse_failed";
  httpStatus: number | null;
  contentType: string | null;
  parseOk: boolean;
  error?: string;
  totalItems: number;
  accepted: number;
  rejected: number;
  accepted7d: number;
  accepted30d: number;
  noisePct: number;
  overlapPct: number | null;
  noiseBreakdown: Record<BroadRssNoiseClass, number>;
  topAccepted: AcceptedItem[];
  rejectedExamples: string[];
  recommendation: "add_now" | "keep_shadow" | "defer" | "reject";
  reason: string;
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

function inWindow(days: number | null, max: number): boolean {
  return days != null && days >= 0 && days <= max;
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

function itemFields(item: Record<string, unknown>): FeedItem | null {
  const title = safeText(item.title).trim();
  const link = safeText(item.link).trim();
  const guid = safeText(item.guid).trim();
  const url = link || guid;
  if (!title || !url) return null;
  const pub = safeText(item.isoDate) || safeText(item.pubDate) || null;
  const description = stripHtml(
    safeText(item.contentSnippet) ||
      safeText(item.summary) ||
      safeText(item.content) ||
      safeText(item.description)
  ).slice(0, 500);
  return {
    title,
    url,
    publishedAt: pub,
    ageDays: daysSince(pub ?? undefined),
    description,
  };
}

async function probeFeed(url: string): Promise<{
  status: number | null;
  contentType: string | null;
  error?: string;
}> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, */*" },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    return { status: res.status, contentType: res.headers.get("content-type") };
  } catch (e) {
    return {
      status: null,
      contentType: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function parseFeed(url: string): Promise<FeedItem[]> {
  const parser = new Parser({ timeout: 20000, headers: { "User-Agent": UA } });
  const feed = await parser.parseURL(url);
  const raw = (feed.items ?? []) as Array<Record<string, unknown>>;
  return raw
    .map(itemFields)
    .filter((i): i is FeedItem => i != null)
    .sort((a, b) => (a.ageDays ?? 999) - (b.ageDays ?? 999));
}

async function loadOverlapIndex(): Promise<OverlapRow[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: sources } = await db
    .from("sources")
    .select("id,slug")
    .in("slug", [...SHADOW_OVERLAP_SOURCE_SLUGS]);
  if (!sources?.length) return [];

  const idToSlug = new Map(sources.map((s) => [s.id as string, s.slug as string]));
  const { data: items } = await db
    .from("raw_items")
    .select("title,canonical_url,source_id")
    .in(
      "source_id",
      sources.map((s) => s.id as string)
    )
    .gte("published_at", cutoff)
    .limit(500);

  return (items ?? []).map((row) => {
    const title = (row.title as string) ?? "";
    const canonical_url = (row.canonical_url as string | null) ?? null;
    return {
      title,
      canonical_url,
      slug: idToSlug.get(row.source_id as string) ?? "unknown",
      clusterKey: normalizeClusteringKey(title),
      urlKey: canonical_url ? urlKey(canonical_url) : "",
    };
  });
}

function hasOverlap(item: AcceptedItem, index: OverlapRow[]): boolean {
  const u = urlKey(item.url);
  const ck = normalizeClusteringKey(item.title);
  for (const row of index) {
    if (row.urlKey && row.urlKey === u) return true;
    if (ck.length >= 8 && row.clusterKey === ck) return true;
  }
  return false;
}

function deriveRecommendation(
  source: ShadowSourceRow,
  stats: {
    parseOk: boolean;
    accepted7d: number;
    accepted30d: number;
    noisePct: number;
    overlapPct: number | null;
    highSignalAccepted: number;
  }
): { recommendation: BenchResult["recommendation"]; reason: string } {
  if (!stats.parseOk) {
    return { recommendation: "reject", reason: "Feed fetch or parse failed." };
  }
  if (stats.accepted30d === 0) {
    return {
      recommendation: "reject",
      reason: "Zero Solana-relevant items in 30d window after filter.",
    };
  }
  if (stats.noisePct >= 0.45) {
    return {
      recommendation: "keep_shadow",
      reason: `High low-signal noise (${Math.round(stats.noisePct * 100)}%) — price/market/sponsored templates.`,
    };
  }
  if (source.candidate_category === "broad_rss" && stats.accepted7d <= 1) {
    return {
      recommendation: "defer",
      reason: "Sparse 7d Solana yield on broad feed — monitor longer or prefer tag/niche feeds.",
    };
  }
  if (stats.overlapPct != null && stats.overlapPct >= 0.5 && stats.highSignalAccepted <= 2) {
    return {
      recommendation: "keep_shadow",
      reason: "High overlap with existing editorial sources; limited incremental value.",
    };
  }
  if (
    stats.highSignalAccepted >= 3 &&
    stats.noisePct < 0.3 &&
    stats.accepted7d >= 2
  ) {
    return {
      recommendation: "add_now",
      reason: "Strong Solana editorial yield with acceptable noise — candidate for future enabled row.",
    };
  }
  if (source.candidate_category === "solana_tag" && stats.accepted7d >= 1) {
    return {
      recommendation: "keep_shadow",
      reason: "Solana tag feed works; continue shadow until price-prediction exclusion is decided.",
    };
  }
  if (source.candidate_category === "defi_editorial" && stats.accepted7d >= 2) {
    return {
      recommendation: "keep_shadow",
      reason: "DeFi editorial feed shows promise — shadow another week before production consideration.",
    };
  }
  return {
    recommendation: "defer",
    reason: "Moderate yield/noise profile — needs more observation windows.",
  };
}

async function benchSource(
  source: ShadowSourceRow,
  overlapIndex: OverlapRow[]
): Promise<BenchResult> {
  const probe = await probeFeed(source.feed_url);
  if (probe.status !== 200) {
    return {
      source,
      status: "fetch_failed",
      httpStatus: probe.status,
      contentType: probe.contentType,
      parseOk: false,
      error: probe.error ?? `HTTP ${probe.status ?? "error"}`,
      totalItems: 0,
      accepted: 0,
      rejected: 0,
      accepted7d: 0,
      accepted30d: 0,
      noisePct: 0,
      overlapPct: null,
      noiseBreakdown: {
        editorial: 0,
        price_prediction: 0,
        generic_market: 0,
        press_release_or_sponsored: 0,
        protocol_specific: 0,
        ecosystem: 0,
        infra_builder: 0,
      },
      topAccepted: [],
      rejectedExamples: [],
      recommendation: "reject",
      reason: probe.error ?? `HTTP ${probe.status ?? "error"}`,
    };
  }

  let items: FeedItem[] = [];
  let parseOk = false;
  let parseError: string | undefined;
  try {
    items = await parseFeed(source.feed_url);
    parseOk = true;
  } catch (e) {
    parseError = e instanceof Error ? e.message : String(e);
  }

  if (!parseOk) {
    return {
      source,
      status: "parse_failed",
      httpStatus: probe.status,
      contentType: probe.contentType,
      parseOk: false,
      error: parseError,
      totalItems: 0,
      accepted: 0,
      rejected: 0,
      accepted7d: 0,
      accepted30d: 0,
      noisePct: 0,
      overlapPct: null,
      noiseBreakdown: {
        editorial: 0,
        price_prediction: 0,
        generic_market: 0,
        press_release_or_sponsored: 0,
        protocol_specific: 0,
        ecosystem: 0,
        infra_builder: 0,
      },
      topAccepted: [],
      rejectedExamples: [],
      recommendation: "reject",
      reason: parseError ?? "Parse failed",
    };
  }

  const rejected: FeedItem[] = [];
  const accepted: AcceptedItem[] = [];

  for (const item of items) {
    const text = `${item.title} ${item.description}`;
    if (
      source.requires_solana_filter &&
      !matchesSolanaFeedFilter(text, source.slug)
    ) {
      rejected.push(item);
      continue;
    }
    accepted.push({
      ...item,
      noiseClass: classifyBroadRssNoise(item.title, item.url, item.description),
    });
  }

  const accepted7d = accepted.filter((i) => inWindow(i.ageDays, 7)).length;
  const accepted30d = accepted.filter((i) => inWindow(i.ageDays, 30)).length;
  const noisePct = noiseRatio(accepted);

  const noiseBreakdown: Record<BroadRssNoiseClass, number> = {
    editorial: 0,
    price_prediction: 0,
    generic_market: 0,
    press_release_or_sponsored: 0,
    protocol_specific: 0,
    ecosystem: 0,
    infra_builder: 0,
  };
  for (const a of accepted) noiseBreakdown[a.noiseClass] += 1;

  const overlapCount =
    overlapIndex.length > 0
      ? accepted.filter((a) => hasOverlap(a, overlapIndex)).length
      : 0;
  const overlapPct =
    overlapIndex.length > 0 && accepted.length > 0
      ? overlapCount / accepted.length
      : null;

  const highSignalAccepted = accepted.filter(
    (a) =>
      a.noiseClass === "editorial" ||
      a.noiseClass === "protocol_specific" ||
      a.noiseClass === "ecosystem" ||
      a.noiseClass === "infra_builder"
  ).length;

  const { recommendation, reason } = deriveRecommendation(source, {
    parseOk: true,
    accepted7d,
    accepted30d,
    noisePct,
    overlapPct,
    highSignalAccepted,
  });

  return {
    source,
    status: "ok",
    httpStatus: probe.status,
    contentType: probe.contentType,
    parseOk: true,
    totalItems: items.length,
    accepted: accepted.length,
    rejected: rejected.length,
    accepted7d,
    accepted30d,
    noisePct,
    overlapPct,
    noiseBreakdown,
    topAccepted: accepted.slice(0, 5),
    rejectedExamples: rejected.slice(0, 3).map((r) => r.title),
    recommendation,
    reason,
  };
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function printSummaryTable(results: BenchResult[]) {
  console.log("\n=== SUMMARY TABLE ===");
  console.log(
    "source | status | parse | acc 7d/30d | noise% | overlap% | recommendation"
  );
  console.log("-".repeat(95));
  for (const r of results) {
    const overlap =
      r.overlapPct == null ? "n/a" : pct(r.overlapPct);
    console.log(
      [
        r.source.slug.padEnd(28),
        r.status.padEnd(14),
        r.parseOk ? "yes" : "no ",
        `${r.accepted7d}/${r.accepted30d}`.padEnd(10),
        pct(r.noisePct).padEnd(7),
        overlap.padEnd(9),
        r.recommendation,
      ].join(" | ")
    );
  }
}

async function main() {
  const sources = loadShadowSources();
  console.log("Broad RSS Shadow Benchmark");
  console.log(`Run at: ${new Date().toISOString()}`);
  console.log(`DRY_RUN (no writes): ${DRY_RUN}`);
  console.log(`Candidates: ${sources.length}`);
  console.log(`Solana filter: matchesSolanaFeedFilter()`);
  console.log("");

  const overlapIndex = await loadOverlapIndex();
  if (overlapIndex.length > 0) {
    console.log(`Overlap index: ${overlapIndex.length} rows (30d editorial sources)`);
  } else {
    console.log("Overlap index: unavailable — overlap% will be n/a");
  }

  const results: BenchResult[] = [];
  for (const source of sources) {
    const r = await benchSource(source, overlapIndex);
    results.push(r);

    console.log(`\n--- ${source.name} (${source.slug}) ---`);
    console.log(`URL: ${source.feed_url}`);
    console.log(`Category: ${source.candidate_category}`);
    console.log(`HTTP: ${r.httpStatus ?? "ERR"} | ${r.contentType ?? "—"}`);
    console.log(`Status: ${r.status} | parse: ${r.parseOk}`);
    if (r.error) console.log(`Error: ${r.error}`);
    console.log(
      `Items: ${r.totalItems} | accepted: ${r.accepted} | rejected: ${r.rejected}`
    );
    console.log(`Accepted 7d/30d: ${r.accepted7d} / ${r.accepted30d}`);
    console.log(`Noise% (low-signal): ${pct(r.noisePct)}`);
    console.log(
      `Overlap%: ${r.overlapPct == null ? "n/a" : pct(r.overlapPct)}`
    );
    console.log(`Noise breakdown: ${JSON.stringify(r.noiseBreakdown)}`);
    console.log(`Recommendation: ${r.recommendation} — ${r.reason}`);
    if (r.topAccepted.length) {
      console.log("Top accepted:");
      for (const a of r.topAccepted) {
        console.log(`  + [${a.noiseClass}] ${a.title}`);
      }
    }
    if (r.rejectedExamples.length) {
      console.log("Rejected examples:");
      for (const t of r.rejectedExamples) console.log(`  - ${t}`);
    }
  }

  printSummaryTable(results);

  const failed = results.filter((r) => r.status !== "ok");
  console.log(`\nFeeds tested: ${results.length}`);
  console.log(`Feeds failed: ${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(`  ! ${f.source.slug}: ${f.reason}`);
  }

  console.log("\n--- JSON ---");
  console.log(
    JSON.stringify(
      results.map((r) => ({
        slug: r.source.slug,
        feed_url: r.source.feed_url,
        candidate_category: r.source.candidate_category,
        status: r.status,
        parseOk: r.parseOk,
        accepted7d: r.accepted7d,
        accepted30d: r.accepted30d,
        noisePct: Number(r.noisePct.toFixed(2)),
        overlapPct: r.overlapPct == null ? null : Number(r.overlapPct.toFixed(2)),
        recommendation: r.recommendation,
        reason: r.reason,
      })),
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
