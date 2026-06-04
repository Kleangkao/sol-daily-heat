import type { Source } from "@/lib/types/db";

export type RawItemType = "news" | "market" | "protocol";

export interface RawItemDraft {
  external_id?: string;
  title: string;
  snippet?: string;
  body_text?: string;
  canonical_url?: string;
  published_at?: string;
  item_type: RawItemType;
  metadata_json?: Record<string, unknown>;
}

export interface AdapterResult {
  slug: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface AdapterContext {
  source: Source;
}

export interface SourceAdapter {
  readonly slug: string;
  isEnabled(ctx: AdapterContext): boolean;
  fetch(ctx: AdapterContext): Promise<RawItemDraft[]>;
}
