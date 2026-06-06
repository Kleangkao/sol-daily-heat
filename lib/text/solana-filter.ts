/** Conservative allowlist for general crypto RSS feeds (e.g. The Block, DL News, Decrypt). */

/** Multi-word or unambiguous phrases — safe for substring match. */
export const SOLANA_FEED_PHRASE_KEYWORDS = [
  "solana",
  "jupiter",
  "raydium",
  "orca",
  "jito",
  "kamino",
  "drift",
  "marinade",
  "helius",
  "metaplex",
  "phantom",
  "backpack",
  "firedancer",
  "pump.fun",
  "pumpfun",
  "magic eden",
  "wormhole",
  "helium",
  "render",
  "depin",
  "saga",
  "seeker",
  "solana mobile",
  "agave",
  "anza",
  "sanctum",
  "tokenization",
  "rwa",
] as const;

/** @deprecated Use phrase list + boundary matchers; kept for docs compatibility. */
export const SOLANA_FEED_KEYWORDS = [
  ...SOLANA_FEED_PHRASE_KEYWORDS,
  "spl",
  "bonk",
  "wif",
  "pump",
] as const;

const SLUGS_REQUIRING_FILTER = new Set([
  "the-block-news",
  "dlnews-rss",
  "decrypt-rss",
  "coindesk-rss",
  "cointelegraph-solana-rss",
  "utoday-rss",
  "thedefiant-rss",
]);

/** Word-boundary patterns for short tickers/symbols (avoid substring false positives). */
const SHORT_TOKEN_PATTERNS: RegExp[] = [
  /\$sol\b/i,
  /\bsolana\b/i,
  /\bsol\b/i,
  /\$spl\b/i,
  /\bspl\b/i,
  /\$wif\b/i,
  /\bwif\b/i,
  /\$bonk\b/i,
  /\bbonk\b/i,
  /\$pump\b/i,
  /\bpump\.fun\b/i,
  /\bpumpfun\b/i,
  /\bpump\s+fun\b/i,
];

/** Single-word ecosystem entities (word boundaries). */
const ENTITY_WORD_PATTERNS: RegExp[] = [
  /\bjupiter\b/i,
  /\bjito\b/i,
  /\bkamino\b/i,
  /\bdrift\b/i,
  /\braydium\b/i,
  /\borca\b/i,
  /\bmarinade\b/i,
  /\bhelius\b/i,
  /\bmetaplex\b/i,
  /\bphantom\b/i,
  /\bbackpack\b/i,
  /\bfiredancer\b/i,
  /\bpyth\b/i,
  /\btensor\b/i,
  /\bwormhole\b/i,
  /\bhelium\b/i,
  /\brender\b/i,
  /\bdepin\b/i,
  /\bsaga\b/i,
  /\bseeker\b/i,
  /\bagave\b/i,
  /\banza\b/i,
  /\bsanctum\b/i,
  /\btokenization\b/i,
  /\brwa\b/i,
];

const MAGIC_EDEN_RE = /\bmagic\s+eden\b/i;

function matchesPhrases(lower: string): boolean {
  return SOLANA_FEED_PHRASE_KEYWORDS.some((kw) => lower.includes(kw));
}

function matchesBoundaryPatterns(text: string): boolean {
  if (MAGIC_EDEN_RE.test(text)) return true;
  return (
    SHORT_TOKEN_PATTERNS.some((re) => re.test(text)) ||
    ENTITY_WORD_PATTERNS.some((re) => re.test(text))
  );
}

export function matchesSolanaFeedFilter(text: string, _sourceSlug?: string): boolean {
  const lower = text.toLowerCase();
  if (matchesPhrases(lower)) return true;
  return matchesBoundaryPatterns(text);
}

export function sourceRequiresSolanaFilter(
  sourceSlug: string,
  metadata?: Record<string, unknown>
): boolean {
  if (SLUGS_REQUIRING_FILTER.has(sourceSlug)) return true;
  return metadata?.requires_solana_filter === true;
}
