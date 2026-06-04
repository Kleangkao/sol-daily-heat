import type { SupabaseClient } from "@supabase/supabase-js";
import type { Source } from "@/lib/types/db";
import type { RawItemDraft } from "@/lib/adapters/types";
import { rawItemContentHash } from "@/lib/ingest/raw-item-content-hash";

export async function upsertRawItems(
  db: SupabaseClient,
  source: Source,
  items: RawItemDraft[]
): Promise<number> {
  if (items.length === 0) return 0;

  const rows = items.map((item) => {
    return {
      source_id: source.id,
      external_id: item.external_id ?? null,
      title: item.title,
      snippet: item.snippet ?? null,
      body_text: item.body_text ?? null,
      canonical_url: item.canonical_url ?? null,
      content_hash: rawItemContentHash(source, item),
      published_at: item.published_at ?? null,
      fetched_at: new Date().toISOString(),
      status: "pending" as const,
      metadata_json: {
        ...item.metadata_json,
        item_type: item.item_type,
      },
    };
  });

  const { error } = await db.from("raw_items").upsert(rows, {
    onConflict: "source_id,content_hash",
    ignoreDuplicates: false,
  });

  if (error) throw error;
  return rows.length;
}
