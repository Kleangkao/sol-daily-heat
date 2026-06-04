const STOP = new Set([
  "the", "and", "for", "with", "from", "that", "this", "your", "are", "was", "were",
  "will", "has", "have", "had", "not", "but", "out", "over", "about", "after", "before",
  "into", "solana", "news", "update", "token", "protocol",
  "tvl", "dexscreener", "boost", "pair", "chain",
]);

export function extractKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

export function titleSimilarityAtLeast2(titleA: string, titleB: string): boolean {
  const a = new Set(extractKeywords(titleA));
  const b = new Set(extractKeywords(titleB));
  let overlap = 0;
  for (const token of Array.from(a)) {
    if (b.has(token)) overlap += 1;
    if (overlap >= 2) return true;
  }
  return false;
}

import { SOLANA_FEED_KEYWORDS } from "@/lib/text/solana-filter";

const SOLANA_KEYWORDS = [...SOLANA_FEED_KEYWORDS, "meteora", "defi"];

export function solanaKeywordScore(text: string): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of SOLANA_KEYWORDS) {
    if (lower.includes(kw)) hits += 1;
  }
  return Math.min(15, hits * 3);
}
