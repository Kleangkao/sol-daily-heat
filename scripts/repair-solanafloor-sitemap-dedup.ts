/**
 * One-time / repeatable repair: merge solanafloor-sitemap raw_items that share canonical_url.
 * Relinks topic_sources, removes duplicate topic_sources rows, deletes duplicate raw_items.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { rawItemContentHash } from "../lib/ingest/raw-item-content-hash";
import { pickPreferredSitemapRawItem } from "../lib/ingest/dedupe-sitemap-raw-items";
import type { Source } from "../lib/types/db";

type RawRow = {
  id: string;
  source_id: string;
  title: string;
  canonical_url: string | null;
  fetched_at: string;
  published_at: string | null;
  snippet: string | null;
  metadata_json: Record<string, unknown>;
  content_hash: string;
};

function urlKey(url: string | null): string | null {
  const u = url?.trim().toLowerCase();
  return u || null;
}

async function countDuplicateUrls(db: SupabaseClient, sourceId: string) {
  const { data } = await db
    .from("raw_items")
    .select("canonical_url")
    .eq("source_id", sourceId);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const k = urlKey((row as { canonical_url: string | null }).canonical_url);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let dupUrlGroups = 0;
  let extraRows = 0;
  for (const n of Array.from(counts.values())) {
    if (n > 1) {
      dupUrlGroups += 1;
      extraRows += n - 1;
    }
  }
  return {
    totalRows: data?.length ?? 0,
    uniqueUrls: counts.size,
    dupUrlGroups,
    extraRows,
  };
}

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing Supabase credentials");
    process.exit(1);
  }

  const { data: source, error: srcErr } = await db
    .from("sources")
    .select("*")
    .eq("slug", "solanafloor-sitemap")
    .maybeSingle();

  if (srcErr || !source) {
    console.error("solanafloor-sitemap source not found");
    process.exit(1);
  }

  const sourceId = source.id as string;
  const before = await countDuplicateUrls(db, sourceId);
  console.log("BEFORE", JSON.stringify(before, null, 2));

  const { data: rows, error: rowErr } = await db
    .from("raw_items")
    .select("id,source_id,title,canonical_url,fetched_at,published_at,snippet,metadata_json,content_hash")
    .eq("source_id", sourceId);

  if (rowErr) throw rowErr;

  const groups = new Map<string, RawRow[]>();
  for (const row of (rows ?? []) as RawRow[]) {
    const k = urlKey(row.canonical_url);
    if (!k) continue;
    const list = groups.get(k) ?? [];
    list.push(row);
    groups.set(k, list);
  }

  let relinked = 0;
  let topicSourcesDeleted = 0;
  let rawDeleted = 0;
  let hashUpdated = 0;

  for (const list of Array.from(groups.values())) {
    if (list.length <= 1) {
      const only = list[0];
      const expectedHash = rawItemContentHash(source as Source, {
        external_id: only.canonical_url ?? undefined,
        title: only.title,
        canonical_url: only.canonical_url ?? undefined,
        item_type: "news",
        metadata_json: only.metadata_json,
      });
      if (only.content_hash !== expectedHash) {
        await db
          .from("raw_items")
          .update({ content_hash: expectedHash })
          .eq("id", only.id);
        hashUpdated += 1;
      }
      continue;
    }

    const keep = pickPreferredSitemapRawItem(list);
    const losers = list.filter((r) => r.id !== keep.id);
    const expectedHash = rawItemContentHash(source as Source, {
      external_id: keep.canonical_url ?? undefined,
      title: keep.title,
      canonical_url: keep.canonical_url ?? undefined,
      item_type: "news",
      metadata_json: keep.metadata_json,
    });

    if (keep.content_hash !== expectedHash) {
      await db
        .from("raw_items")
        .update({ content_hash: expectedHash, title: keep.title })
        .eq("id", keep.id);
      hashUpdated += 1;
    }

    for (const loser of losers) {
      const { data: links } = await db
        .from("topic_sources")
        .select("id,topic_id")
        .eq("raw_item_id", loser.id);

      for (const link of links ?? []) {
        const topicId = (link as { topic_id: string }).topic_id;
        const linkId = (link as { id: string }).id;

        const { data: existing } = await db
          .from("topic_sources")
          .select("id")
          .eq("topic_id", topicId)
          .eq("raw_item_id", keep.id)
          .maybeSingle();

        if (existing?.id) {
          await db.from("topic_sources").delete().eq("id", linkId);
          topicSourcesDeleted += 1;
        } else {
          const { error: upErr } = await db
            .from("topic_sources")
            .update({
              raw_item_id: keep.id,
              source_url: keep.canonical_url,
            })
            .eq("id", linkId);
          if (!upErr) relinked += 1;
        }
      }

      const { error: delErr } = await db.from("raw_items").delete().eq("id", loser.id);
      if (!delErr) rawDeleted += 1;
    }
  }

  const after = await countDuplicateUrls(db, sourceId);
  console.log(
    JSON.stringify(
      {
        repair: { relinked, topicSourcesDeleted, rawDeleted, hashUpdated },
        after,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
