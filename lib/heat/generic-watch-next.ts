const GENERIC_WATCH_NEXT_PATTERNS = [
  /watch tvl trend over the next 24/i,
  /watch for additional independent coverage/i,
  /watch for follow-up signals and primary-source confirmation/i,
  /watch for follow-up reporting or official announcements on the same story/i,
  /check whether on-chain or ecosystem signals align with the coverage/i,
  /open the source article for full context/i,
  /watch for follow-up coverage from primary or official sources/i,
];

/** Pipeline / template watch-next lines with no story-specific value. */
export function isGenericWatchNext(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return GENERIC_WATCH_NEXT_PATTERNS.some((re) => re.test(t));
}

export function filterSpecificWatchNext(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim().toLowerCase();
    if (!key || isGenericWatchNext(item) || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}
