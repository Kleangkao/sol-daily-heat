import type { Source } from "@/lib/types/db";
import type { RawItemDraft } from "@/lib/adapters/types";
import { contentHash } from "@/lib/text/hash";
import { SOLANAFLOOR_SITEMAP_SLUG } from "@/lib/sources/sitemap-ingest-policy";

/** Sitemap discovery rows dedupe on canonical URL only (title formatting may change). */
export function isSitemapDiscoveryDraft(
  item: RawItemDraft,
  source: Source
): boolean {
  if (item.metadata_json?.sitemap_discovery === true) return true;
  if (source.slug === SOLANAFLOOR_SITEMAP_SLUG) return true;
  const meta = (source.metadata_json ?? {}) as Record<string, unknown>;
  return meta.discovery === "sitemap" || source.source_type === "sitemap";
}

export function rawItemContentHash(source: Source, item: RawItemDraft): string {
  if (isSitemapDiscoveryDraft(item, source)) {
    const url = (item.canonical_url ?? item.external_id ?? "").trim().toLowerCase();
    if (!url) {
      return contentHash(`${source.id}|sitemap-v1|missing-url`);
    }
    return contentHash(`${source.id}|sitemap-v1|${url}`);
  }

  const hashInput = `${source.id}|${item.external_id ?? ""}|${item.title}|${item.canonical_url ?? ""}`;
  return contentHash(hashInput);
}
