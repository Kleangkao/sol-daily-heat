/** Dedupe trimmed snippet strings (case-insensitive). Safe for client + server bundles. */
export function uniqueSnippets(snippets: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of snippets) {
    const s = raw.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
