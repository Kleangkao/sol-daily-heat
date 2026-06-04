import type { RawItem } from "@/lib/types/db";

/** Prefer mixed-case / title-case headline over legacy ALL-CAPS slug titles. */
export function sitemapTitleQualityScore(title: string): number {
  let score = 0;
  const t = title.trim();
  if (!t) return -100;
  if (t !== t.toUpperCase()) score += 12;
  const words = t.split(/\s+/).filter(Boolean);
  const shout = words.filter((w) => w.length > 2 && w === w.toUpperCase()).length;
  score -= shout * 2;
  if (/[a-z]/.test(t) && /[A-Z]/.test(t)) score += 4;
  return score;
}

export function pickPreferredSitemapRawItem<T extends { title: string; fetched_at?: string | null }>(
  rows: T[]
): T {
  return [...rows].sort((a, b) => {
    const q = sitemapTitleQualityScore(b.title) - sitemapTitleQualityScore(a.title);
    if (q !== 0) return q;
    const tb = new Date(b.fetched_at ?? 0).getTime();
    const ta = new Date(a.fetched_at ?? 0).getTime();
    return tb - ta;
  })[0];
}

function canonicalKey(url: string | null | undefined): string | null {
  const u = url?.trim().toLowerCase();
  return u && /^https?:\/\//i.test(u) ? u : null;
}

/** One raw row per canonical URL for sitemap discovery items (newest/best title wins). */
export function dedupeSitemapRawItemsByCanonical<T extends RawItem>(
  items: T[]
): T[] {
  const passthrough: T[] = [];
  const byUrl = new Map<string, T[]>();

  for (const item of items) {
    if (item.metadata_json?.sitemap_discovery !== true) {
      passthrough.push(item);
      continue;
    }
    const key = canonicalKey(item.canonical_url);
    if (!key) {
      passthrough.push(item);
      continue;
    }
    const list = byUrl.get(key) ?? [];
    list.push(item);
    byUrl.set(key, list);
  }

  const deduped: T[] = [...passthrough];
  for (const group of Array.from(byUrl.values())) {
    deduped.push(pickPreferredSitemapRawItem(group));
  }
  return deduped;
}
