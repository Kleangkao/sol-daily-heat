import type { RawItem } from "@/lib/types/db";
import { titleSimilarityAtLeast2 } from "@/lib/text/keywords";
import { normalizeClusteringKey, toSlug } from "@/lib/text/normalize";

export type RawItemGroup = {
  clustering_key: string;
  slug: string;
  title: string;
  items: RawItem[];
};

function itemTypeOf(item: RawItem): string {
  return (item.metadata_json?.item_type as string) ?? "news";
}

/** Stable keys so unrelated market/protocol rows do not merge on generic title words. */
export function stableClusterKey(item: RawItem): string | null {
  const meta = item.metadata_json ?? {};
  const itemType = itemTypeOf(item);

  if (itemType === "market") {
    const mint = meta.tokenAddress ?? meta.mint;
    if (typeof mint === "string" && mint.length > 0) return `market-mint-${mint}`;
    if (item.external_id) return `market-ext-${item.external_id}`;
    return `market-title-${normalizeClusteringKey(item.title)}`;
  }

  if (itemType === "protocol") {
    const slug = meta.defillama_id;
    if (typeof slug === "string" && slug.length > 0) return `protocol-${slug}`;
    if (item.external_id) return `protocol-ext-${item.external_id}`;
    return `protocol-title-${normalizeClusteringKey(item.title)}`;
  }

  return null;
}

function keysMatch(a: RawItem, b: RawItem): boolean {
  const ka = stableClusterKey(a);
  const kb = stableClusterKey(b);
  if (ka && kb) return ka === kb;
  if (ka || kb) return false;
  return titleSimilarityAtLeast2(a.title, b.title);
}

export function clusterRawItems(items: RawItem[]): RawItemGroup[] {
  const groups: RawItem[][] = [];

  for (const item of items) {
    let matched = -1;
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].some((g) => keysMatch(g, item))) {
        matched = i;
        break;
      }
    }
    if (matched < 0) groups.push([item]);
    else groups[matched].push(item);
  }

  return groups.map((group) => {
    const primary = [...group].sort(
      (a, b) =>
        new Date(b.published_at ?? b.fetched_at).getTime() -
        new Date(a.published_at ?? a.fetched_at).getTime()
    )[0];
    const clustering_key =
      stableClusterKey(primary) ?? normalizeClusteringKey(primary.title);
    return {
      clustering_key,
      slug: toSlug(primary.title),
      title: primary.title,
      items: group,
    };
  });
}
