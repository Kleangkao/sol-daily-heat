export type SitemapUrlEntry = {
  loc: string;
  lastmod?: string;
};

/** Parse a sitemap urlset XML document (no external XML dependency). */
export function parseUrlSetXml(xml: string): SitemapUrlEntry[] {
  const entries: SitemapUrlEntry[] = [];
  const blocks = xml.match(/<url>[\s\S]*?<\/url>/gi) ?? [];
  for (const block of blocks) {
    const loc = block.match(/<loc>\s*([^<]+)\s*<\/loc>/i)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>\s*([^<]+)\s*<\/lastmod>/i)?.[1]?.trim();
    entries.push({ loc, lastmod });
  }
  return entries;
}

/** Parse sitemap index and return child sitemap loc values. */
export function parseSitemapIndexLocs(xml: string): string[] {
  return (xml.match(/<loc>\s*([^<]+)\s*<\/loc>/gi) ?? [])
    .map((tag) => tag.match(/<loc>\s*([^<]+)\s*<\/loc>/i)?.[1]?.trim())
    .filter((u): u is string => Boolean(u));
}

const NEWS_ARTICLE_RE = /^https:\/\/solanafloor\.com\/news\/([a-z0-9-]+)\/?$/i;

const SMALL_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "on",
  "in",
  "to",
  "as",
  "of",
  "at",
  "by",
  "vs",
  "with",
  "from",
]);

const ACRONYMS = new Set([
  "sol",
  "usdc",
  "usdt",
  "btc",
  "eth",
  "etf",
  "rwa",
  "tvl",
  "dex",
  "dao",
  "nft",
  "jito",
  "orca",
  "pyth",
  "api",
  "sec",
  "ceo",
  "ipo",
  "rku",
  "clmm",
  "amm",
  "lst",
  "defi",
  "ai",
]);

export function isSolanaFloorNewsArticleUrl(loc: string): boolean {
  return NEWS_ARTICLE_RE.test(loc.trim());
}

export function slugFromSolanaFloorNewsUrl(loc: string): string | null {
  const m = loc.trim().match(NEWS_ARTICLE_RE);
  return m?.[1] ?? null;
}

function formatToken(word: string, index: number): string {
  const lower = word.toLowerCase();
  if (ACRONYMS.has(lower)) return lower.toUpperCase();
  if (/^\$/.test(word)) return word.toUpperCase();
  if (/^[a-z]{2,5}$/i.test(word) && word === word.toUpperCase()) return word;
  if (index > 0 && SMALL_WORDS.has(lower)) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Human-readable headline from URL slug (no article fetch). */
export function slugToHeadline(slug: string): string {
  const parts = slug.split("-").filter(Boolean);
  const out: string[] = [];
  let i = 0;

  while (i < parts.length) {
    const p = parts[i];
    const next = parts[i + 1];
    const next2 = parts[i + 2];

    if (/^\d+$/.test(p) && next && /^\d+$/.test(next) && next2?.toLowerCase() === "b") {
      out.push(`${p}.${next}B`);
      i += 3;
      continue;
    }
    if (/^\d+$/.test(p) && next?.toLowerCase() === "b") {
      out.push(`${p}B`);
      i += 2;
      continue;
    }
    if (/^\d+$/.test(p) && next && /^\d+$/.test(next)) {
      out.push(`${p}.${next}`);
      i += 2;
      continue;
    }

    out.push(formatToken(p, out.length));
    i += 1;
  }

  return out.join(" ");
}
