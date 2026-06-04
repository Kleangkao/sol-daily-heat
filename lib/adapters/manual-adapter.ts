import { readFile } from "fs/promises";
import path from "path";
import type { SourceAdapter, AdapterContext, RawItemDraft } from "./types";

export class ManualAdapter implements SourceAdapter {
  readonly slug = "manual";

  isEnabled(ctx: AdapterContext): boolean {
    return ctx.source.source_type === "manual" && ctx.source.is_enabled;
  }

  async fetch(ctx: AdapterContext): Promise<RawItemDraft[]> {
    const filePath = path.join(process.cwd(), "data", "manual-items.json");
    let raw: string;
    try {
      raw = await readFile(filePath, "utf-8");
    } catch {
      return [];
    }

    const items = JSON.parse(raw) as Array<{
      id: string;
      title: string;
      snippet?: string;
      url?: string;
      published_at?: string | null;
      item_type?: string;
    }>;

    return items.map((item) => ({
      external_id: item.id,
      title: item.title,
      snippet: item.snippet,
      canonical_url: item.url,
      published_at: item.published_at ?? new Date().toISOString(),
      item_type: (item.item_type as RawItemDraft["item_type"]) ?? "news",
      metadata_json: { source: ctx.source.slug, item_type: item.item_type ?? "news" },
    }));
  }
}
