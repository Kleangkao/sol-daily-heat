/**
 * Fast source verification (read-only, no DB writes).
 * - Cointelegraph: simulate post-Wave-4A ingest guards on live feed
 * - 4D candidates: probe official project RSS/Atom feeds
 * - 4B preview: Blockworks feed probe (not enabled)
 *
 * Run: npx tsx scripts/audit-quick-sources.ts
 */
import Parser from "rss-parser";
import { matchesSolanaFeedFilter } from "../lib/text/solana-filter";
import {
  classifyCointelegraphNoise,
  isPricePredictionItem,
} from "../lib/sources/cointelegraph-shadow-patterns";
import { classifyBroadRssNoise, LOW_SIGNAL_NOISE_CLASSES } from "../lib/sources/broad-rss-noise";
import { safeText, stripHtml } from "../lib/text/normalize";

const parser = new Parser({ timeout: 20000 });

type FeedCandidate = {
  slug: string;
  name: string;
  url: string;
  kind: "official_blog" | "github_release" | "status" | "broad_rss";
  reliability?: number;
  notes?: string;
};

const OFFICIAL_4D_CANDIDATES: FeedCandidate[] = [
  {
    slug: "jupiter-blog",
    name: "Jupiter — blog RSS",
    url: "https://station.jup.ag/blog/rss.xml",
    kind: "official_blog",
    reliability: 0.86,
  },
  {
    slug: "jupiter-medium",
    name: "Jupiter — Medium",
    url: "https://medium.com/feed/@jup-ag",
    kind: "official_blog",
    reliability: 0.84,
  },
  {
    slug: "kamino-blog",
    name: "Kamino — blog RSS",
    url: "https://kamino.finance/blog/rss.xml",
    kind: "official_blog",
    reliability: 0.85,
  },
  {
    slug: "kamino-medium",
    name: "Kamino — Medium",
    url: "https://medium.com/feed/@kamino",
    kind: "official_blog",
    reliability: 0.83,
  },
  {
    slug: "tensor-medium",
    name: "Tensor — Medium",
    url: "https://medium.com/feed/@tensor_hq",
    kind: "official_blog",
    reliability: 0.82,
  },
  {
    slug: "meteora-medium",
    name: "Meteora — Medium",
    url: "https://medium.com/feed/@meteora",
    kind: "official_blog",
    reliability: 0.84,
  },
  {
    slug: "marginfi-github-releases",
    name: "marginfi — GitHub Releases",
    url: "https://github.com/mrgnlabs/marginfi-v2/releases.atom",
    kind: "github_release",
    reliability: 0.84,
  },
  {
    slug: "backpack-blog",
    name: "Backpack — blog",
    url: "https://backpack.app/blog/rss.xml",
    kind: "official_blog",
    reliability: 0.82,
  },
  {
    slug: "phoenix-github-releases",
    name: "Phoenix — GitHub Releases",
    url: "https://github.com/Ellipsis-Labs/phoenix-v1/releases.atom",
    kind: "github_release",
    reliability: 0.85,
  },
  {
    slug: "jupiter-github-releases",
    name: "Jupiter core — GitHub Releases",
    url: "https://github.com/jup-ag/jupiter-swap-api/releases.atom",
    kind: "github_release",
    reliability: 0.84,
    notes: "API repo — may be low editorial value",
  },
];

const BLOCKWORKS_PREVIEW: FeedCandidate = {
  slug: "blockworks-rss",
  name: "Blockworks — RSS (4B preview)",
  url: "https://blockworks.co/feed",
  kind: "broad_rss",
  reliability: 0.77,
};

function daysSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 86400000;
}

function itemPub(item: Record<string, unknown>): string | undefined {
  const pub =
    safeText(item.isoDate) ||
    safeText(item.pubDate) ||
    safeText(item.updated);
  return pub || undefined;
}

async function probeFeed(candidate: FeedCandidate) {
  const result = {
    slug: candidate.slug,
    name: candidate.name,
    url: candidate.url,
    kind: candidate.kind,
    httpOk: false,
    parseOk: false,
    itemCount: 0,
    items30d: 0,
    items7d: 0,
    solanaFiltered30d: 0,
    solanaFiltered7d: 0,
    lowSignal30d: 0,
    sampleTitles: [] as string[],
    error: undefined as string | undefined,
    verdict: "reject" as "add_now" | "monitor" | "reject",
    reason: "",
  };

  try {
    const feed = await parser.parseURL(candidate.url);
    result.httpOk = true;
    result.parseOk = true;
    const items = (feed.items ?? []) as Array<Record<string, unknown>>;
    result.itemCount = items.length;

    for (const item of items) {
      const title = safeText(item.title).trim();
      const link = safeText(item.link).trim();
      const desc =
        safeText(item.contentSnippet) ||
        safeText(item.summary) ||
        stripHtml(safeText(item.content));
      const pub = itemPub(item);
      const age = daysSince(pub);

      if (age != null && age <= 30) {
        result.items30d += 1;
        const needsFilter = candidate.kind === "broad_rss";
        const text = `${title} ${desc}`;
        const solanaOk = !needsFilter || matchesSolanaFeedFilter(text, candidate.slug);
        if (solanaOk) {
          result.solanaFiltered30d += 1;
          if (result.sampleTitles.length < 5) result.sampleTitles.push(title);
          const noise = classifyBroadRssNoise(title, link, desc);
          if (LOW_SIGNAL_NOISE_CLASSES.has(noise)) result.lowSignal30d += 1;
        }
        if (age <= 7) {
          result.items7d += 1;
          if (solanaOk) result.solanaFiltered7d += 1;
        }
      }
    }

    if (candidate.kind === "broad_rss") {
      const passRate =
        result.items30d > 0 ? result.solanaFiltered30d / result.items30d : 0;
      const noiseRate =
        result.solanaFiltered30d > 0
          ? result.lowSignal30d / result.solanaFiltered30d
          : 1;
      if (result.parseOk && result.solanaFiltered7d >= 1 && noiseRate < 0.5) {
        result.verdict = "add_now";
        result.reason = `Solana yield OK (7d=${result.solanaFiltered7d}, noise=${Math.round(noiseRate * 100)}%)`;
      } else if (result.parseOk && result.solanaFiltered30d >= 2) {
        result.verdict = "monitor";
        result.reason = `Low 7d volume or elevated noise (7d=${result.solanaFiltered7d}, noise=${Math.round(noiseRate * 100)}%)`;
      } else {
        result.verdict = "reject";
        result.reason = `Thin Solana yield (7d=${result.solanaFiltered7d}, passRate=${Math.round(passRate * 100)}%)`;
      }
    } else if (candidate.kind === "github_release") {
      if (result.items7d >= 1) {
        result.verdict = "add_now";
        result.reason = `Fresh releases in 7d (${result.items7d})`;
      } else if (result.items30d >= 1) {
        result.verdict = "monitor";
        result.reason = `Releases in 30d but quiet this week (${result.items30d})`;
      } else {
        result.verdict = "monitor";
        result.reason = "Feed parses; no releases in 30d";
      }
    } else {
      if (result.items7d >= 1) {
        result.verdict = "add_now";
        result.reason = `Posts in 7d (${result.items7d})`;
      } else if (result.items30d >= 2) {
        result.verdict = "monitor";
        result.reason = `Archive posts in 30d (${result.items30d}) — may be quiet`;
      } else if (result.parseOk && result.itemCount > 0) {
        result.verdict = "monitor";
        result.reason = "Feed parses; low recent volume";
      } else {
        result.verdict = "reject";
        result.reason = result.itemCount === 0 ? "Empty feed" : "Parse failed or no recent posts";
      }
    }
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
    result.verdict = "reject";
    result.reason = result.error;
  }

  return result;
}

async function auditCointelegraphFast() {
  const url = "https://cointelegraph.com/rss/tag/solana";
  const feed = await parser.parseURL(url);
  const items = (feed.items ?? []) as Array<Record<string, unknown>>;

  let fetched = 0;
  let rejected = 0;
  let stored = 0;
  const storedTitles: string[] = [];
  const noiseCounts: Record<string, number> = {};

  for (const item of items.slice(0, 30)) {
    fetched += 1;
    const title = safeText(item.title).trim();
    const link = safeText(item.link).trim();
    const desc =
      safeText(item.contentSnippet) ||
      safeText(item.summary) ||
      stripHtml(safeText(item.content));

    if (!matchesSolanaFeedFilter(`${title} ${desc}`, "cointelegraph-solana-rss")) {
      rejected += 1;
      continue;
    }
    if (isPricePredictionItem(title, link)) {
      rejected += 1;
      continue;
    }
    stored += 1;
    if (storedTitles.length < 8) storedTitles.push(title);
    const noise = classifyCointelegraphNoise(title, link);
    noiseCounts[noise] = (noiseCounts[noise] ?? 0) + 1;
  }

  const lowSignal =
    (noiseCounts.price_prediction ?? 0) + (noiseCounts.generic_market ?? 0);
  const noisePct = stored > 0 ? lowSignal / stored : 0;

  return {
    fetched,
    rejected,
    stored,
    storedTitles,
    noiseCounts,
    noisePct,
    pass:
      stored >= 3 &&
      noisePct < 0.45 &&
      (noiseCounts.editorial ?? 0) >= 2,
  };
}

async function main() {
  console.log("Quick source audit — read-only\n");

  console.log("=== Cointelegraph (Wave 4A guards, live feed) ===\n");
  const ct = await auditCointelegraphFast();
  console.log(JSON.stringify(ct, null, 2));
  console.log(
    ct.pass
      ? "✓ Fast check PASS — safe to keep enabled; no need to wait 6–9h if ingest matches."
      : "✗ Fast check FAIL — tune guards/cap before adding more broad RSS.\n"
  );

  console.log("\n=== 4B preview: Blockworks ===\n");
  const bw = await probeFeed(BLOCKWORKS_PREVIEW);
  console.log(JSON.stringify(bw, null, 2));

  console.log("\n=== 4D official project candidates ===\n");
  const results = [];
  for (const c of OFFICIAL_4D_CANDIDATES) {
    const r = await probeFeed(c);
    results.push(r);
    const icon = r.verdict === "add_now" ? "✓" : r.verdict === "monitor" ? "~" : "✗";
    console.log(`${icon} ${r.slug}: ${r.verdict} — ${r.reason}`);
  }

  const addNow = results.filter((r) => r.verdict === "add_now");
  const monitor = results.filter((r) => r.verdict === "monitor");

  console.log("\n--- Summary ---");
  console.log(`Cointelegraph fast: ${ct.pass ? "PASS" : "FAIL"}`);
  console.log(`4B Blockworks: ${bw.verdict} — ${bw.reason}`);
  console.log(`4D add_now (${addNow.length}): ${addNow.map((r) => r.slug).join(", ") || "(none)"}`);
  console.log(`4D monitor (${monitor.length}): ${monitor.map((r) => r.slug).join(", ") || "(none)"}`);

  if (addNow.length > 0) {
    console.log("\nSuggested 4D first wave (enable 1–2 at a time):");
    for (const r of addNow.slice(0, 3)) {
      console.log(`  • ${r.slug} — ${r.url}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
