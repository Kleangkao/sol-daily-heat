/**
 * Broad RSS source discovery audit (read-only, no DB writes).
 * Run: npx tsx scripts/audit-broad-rss-discovery.ts
 */
import Parser from "rss-parser";
import { matchesSolanaFeedFilter } from "../lib/text/solana-filter";
import { stripHtml } from "../lib/text/normalize";

type Candidate = {
  id: string;
  label: string;
  url: string;
  notes?: string;
};

const CANDIDATES: Candidate[] = [
  {
    id: "cointelegraph-global",
    label: "Cointelegraph — global RSS",
    url: "https://cointelegraph.com/rss",
  },
  {
    id: "cointelegraph-solana-tag",
    label: "Cointelegraph — Solana tag RSS",
    url: "https://cointelegraph.com/rss/tag/solana",
  },
  {
    id: "alicedaily-feed",
    label: "Alice Daily — /feed",
    url: "https://alicedaily.org/feed",
    notes: "Discovered via common WordPress path probe",
  },
  {
    id: "alicedaily-rss",
    label: "Alice Daily — /rss.xml",
    url: "https://alicedaily.org/rss.xml",
    notes: "Common RSS path probe",
  },
  {
    id: "alicedaily-atom",
    label: "Alice Daily — /atom.xml",
    url: "https://alicedaily.org/atom.xml",
    notes: "Common Atom path probe",
  },
];

const UA_DEFAULT = "SolDaily-RSS-Audit/1.0 (+https://github.com/Kleangkao/sol-daily-heat)";
const UA_BROWSER =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

type FetchProbe = {
  status: number | null;
  contentType: string | null;
  bodySnippet: string;
  error?: string;
  usedUserAgent: string;
};

type ItemAudit = {
  title: string;
  pubDate: string | null;
  ageDays: number | null;
  solanaMatch: boolean;
};

type FeedAudit = {
  candidate: Candidate;
  fetchDefaultUa: FetchProbe;
  fetchBrowserUa?: FetchProbe;
  parseSuccess: boolean;
  parseError?: string;
  totalItems: number;
  items7d: number;
  items30d: number;
  solana7d: number;
  solana30d: number;
  matchedTitles: string[];
  rejectedExamples: string[];
  requiresUserAgent: boolean;
  noiseRisk: "low" | "medium" | "high";
  recommendation: "add_now" | "test_in_shadow" | "defer" | "reject";
  recommendationReason: string;
};

function daysSince(isoOrRfc: string | undefined): number | null {
  if (!isoOrRfc) return null;
  const t = new Date(isoOrRfc).getTime();
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 86400000;
}

async function probeUrl(url: string, userAgent: string): Promise<FetchProbe> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    return {
      status: res.status,
      contentType: res.headers.get("content-type"),
      bodySnippet: text.slice(0, 240).replace(/\s+/g, " ").trim(),
      usedUserAgent: userAgent,
    };
  } catch (e) {
    return {
      status: null,
      contentType: null,
      bodySnippet: "",
      error: e instanceof Error ? e.message : String(e),
      usedUserAgent: userAgent,
    };
  }
}

function itemText(item: Record<string, unknown>): string {
  const title = typeof item.title === "string" ? item.title : "";
  const content = typeof item.content === "string" ? item.content : "";
  const summary = typeof item.contentSnippet === "string" ? item.contentSnippet : "";
  const desc = typeof item.description === "string" ? item.description : "";
  return stripHtml(`${title} ${summary || desc || content}`);
}

async function auditFeed(candidate: Candidate): Promise<FeedAudit> {
  const fetchDefaultUa = await probeUrl(candidate.url, UA_DEFAULT);
  let fetchBrowserUa: FetchProbe | undefined;
  let probe = fetchDefaultUa;
  let requiresUserAgent = false;

  const looksLikeFeed =
    fetchDefaultUa.status === 200 &&
    (fetchDefaultUa.contentType?.includes("xml") ||
      fetchDefaultUa.contentType?.includes("rss") ||
      fetchDefaultUa.bodySnippet.includes("<rss") ||
      fetchDefaultUa.bodySnippet.includes("<feed"));

  if (!looksLikeFeed) {
    fetchBrowserUa = await probeUrl(candidate.url, UA_BROWSER);
    const browserLooksLikeFeed =
      fetchBrowserUa.status === 200 &&
      (fetchBrowserUa.contentType?.includes("xml") ||
        fetchBrowserUa.contentType?.includes("rss") ||
        fetchBrowserUa.bodySnippet.includes("<rss") ||
        fetchBrowserUa.bodySnippet.includes("<feed"));
    if (browserLooksLikeFeed) {
      requiresUserAgent = true;
      probe = fetchBrowserUa;
    }
  }

  const parser = new Parser({ timeout: 20000 });
  let parseSuccess = false;
  let parseError: string | undefined;
  let items: ItemAudit[] = [];

  if (probe.status === 200 && !probe.error) {
    try {
      const feed = await parser.parseURL(candidate.url);
      parseSuccess = true;
      items = (feed.items ?? []).map((item) => {
        const text = itemText(item as Record<string, unknown>);
        const pub = item.isoDate || item.pubDate || null;
        return {
          title: (item.title ?? "(no title)").trim(),
          pubDate: pub ?? null,
          ageDays: daysSince(pub ?? undefined),
          solanaMatch: matchesSolanaFeedFilter(text),
        };
      });
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e);
    }
  } else {
    parseError = probe.error ?? `HTTP ${probe.status ?? "unknown"}`;
  }

  const inWindow = (days: number | null, max: number) =>
    days != null && days >= 0 && days <= max;

  const items7d = items.filter((i) => inWindow(i.ageDays, 7)).length;
  const items30d = items.filter((i) => inWindow(i.ageDays, 30)).length;
  const solana7d = items.filter((i) => inWindow(i.ageDays, 7) && i.solanaMatch).length;
  const solana30d = items.filter((i) => inWindow(i.ageDays, 30) && i.solanaMatch).length;

  const matchedTitles = items
    .filter((i) => i.solanaMatch)
    .slice(0, 8)
    .map((i) => i.title);
  const rejectedExamples = items
    .filter((i) => !i.solanaMatch)
    .slice(0, 5)
    .map((i) => i.title);

  const isAlice = candidate.id.startsWith("alicedaily");
  const isSolanaTag = candidate.id === "cointelegraph-solana-tag";
  const isGlobal = candidate.id === "cointelegraph-global";

  let noiseRisk: FeedAudit["noiseRisk"] = "low";
  let recommendation: FeedAudit["recommendation"] = "reject";
  let recommendationReason = "Feed unavailable or not parseable.";

  if (!parseSuccess) {
    recommendation = "reject";
    recommendationReason = isAlice
      ? "No public RSS endpoint; Alice Daily is an app UI, not a publisher feed."
      : parseError ?? "Parse failed.";
  } else if (isSolanaTag) {
    noiseRisk = "low";
    recommendation = solana7d >= 1 ? "test_in_shadow" : "defer";
    recommendationReason =
      solana7d >= 1
        ? `Dedicated Solana tag feed with ${solana7d} items in 7d — low noise, good shadow candidate.`
        : "Valid feed but low 7d volume; monitor before enabling.";
  } else if (isGlobal) {
    const rejectRatio =
      items30d > 0 ? (items30d - solana30d) / items30d : 1;
    noiseRisk = rejectRatio > 0.85 ? "high" : rejectRatio > 0.6 ? "medium" : "low";
    recommendation = solana7d >= 2 ? "test_in_shadow" : solana7d === 1 ? "defer" : "reject";
    recommendationReason =
      solana7d >= 2
        ? `Global feed yields ${solana7d} Solana matches / 7d with existing filter — shadow only (high baseline noise).`
        : solana7d === 1
          ? "Sparse Solana yield on global feed; prefer Solana tag feed first."
          : "Insufficient Solana yield on global feed for Solana-only product.";
  }

  return {
    candidate,
    fetchDefaultUa,
    fetchBrowserUa,
    parseSuccess,
    parseError,
    totalItems: items.length,
    items7d,
    items30d,
    solana7d,
    solana30d,
    matchedTitles,
    rejectedExamples,
    requiresUserAgent,
    noiseRisk,
    recommendation,
    recommendationReason,
  };
}

function printAudit(a: FeedAudit) {
  console.log(`\n=== ${a.candidate.label} ===`);
  console.log(`URL: ${a.candidate.url}`);
  console.log(
    `HTTP (default UA): ${a.fetchDefaultUa.status ?? "ERR"} | ${a.fetchDefaultUa.contentType ?? "—"}`
  );
  if (a.fetchBrowserUa) {
    console.log(
      `HTTP (browser UA): ${a.fetchBrowserUa.status ?? "ERR"} | ${a.fetchBrowserUa.contentType ?? "—"}`
    );
  }
  console.log(`Parse success: ${a.parseSuccess}${a.parseError ? ` (${a.parseError})` : ""}`);
  console.log(`Items in feed: ${a.totalItems}`);
  console.log(`7d / 30d items: ${a.items7d} / ${a.items30d}`);
  console.log(`7d / 30d Solana-filtered: ${a.solana7d} / ${a.solana30d}`);
  console.log(`Requires User-Agent: ${a.requiresUserAgent ? "yes" : "no"}`);
  console.log(`Noise risk: ${a.noiseRisk}`);
  console.log(`Recommendation: ${a.recommendation} — ${a.recommendationReason}`);
  if (a.matchedTitles.length) {
    console.log("Matched titles:");
    for (const t of a.matchedTitles) console.log(`  + ${t}`);
  }
  if (a.rejectedExamples.length) {
    console.log("Rejected examples:");
    for (const t of a.rejectedExamples) console.log(`  - ${t}`);
  }
}

async function main() {
  console.log("Broad RSS Source Discovery Audit");
  console.log(`Run at: ${new Date().toISOString()}`);
  console.log(`Filter: lib/text/solana-filter.ts (matchesSolanaFeedFilter)`);

  const results: FeedAudit[] = [];
  for (const c of CANDIDATES) {
    results.push(await auditFeed(c));
  }

  for (const r of results) printAudit(r);

  console.log("\n--- JSON summary ---");
  console.log(
    JSON.stringify(
      results.map((r) => ({
        id: r.candidate.id,
        url: r.candidate.url,
        status: r.fetchDefaultUa.status,
        contentType: r.fetchDefaultUa.contentType,
        parseSuccess: r.parseSuccess,
        totalItems: r.totalItems,
        solana7d: r.solana7d,
        solana30d: r.solana30d,
        requiresUserAgent: r.requiresUserAgent,
        noiseRisk: r.noiseRisk,
        recommendation: r.recommendation,
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
