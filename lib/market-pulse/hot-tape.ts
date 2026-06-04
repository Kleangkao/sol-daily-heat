import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEXSCREENER_SOURCE_SLUG,
  HOT_TAPE_MAX_ITEMS,
  HOT_TAPE_WINDOW_MS,
} from "@/lib/market-pulse/constants";
import type { HotTapeItem, HotTapeSignal } from "@/lib/market-pulse/types";

function cutoffIso(): string {
  return new Date(Date.now() - HOT_TAPE_WINDOW_MS).toISOString();
}

function signalOf(meta: Record<string, unknown>): HotTapeSignal | null {
  const s = meta.signal;
  if (s === "boost" || s === "new_pair") return s;
  return null;
}

function mintOf(meta: Record<string, unknown>): string | undefined {
  const m = meta.mint ?? meta.tokenAddress;
  return typeof m === "string" && m.length > 0 ? m : undefined;
}

export async function buildHotTapeFromRawItems(
  db: SupabaseClient,
  options?: { excludeMints?: Set<string> }
): Promise<HotTapeItem[]> {
  const exclude = options?.excludeMints ?? new Set<string>();
  const { data: source } = await db
    .from("sources")
    .select("id")
    .eq("slug", DEXSCREENER_SOURCE_SLUG)
    .maybeSingle();

  if (!source?.id) return [];

  const { data: rows, error } = await db
    .from("raw_items")
    .select("title, canonical_url, fetched_at, metadata_json")
    .eq("source_id", source.id)
    .gte("fetched_at", cutoffIso())
    .order("fetched_at", { ascending: false })
    .limit(80);

  if (error) throw error;

  const seenMint = new Set<string>();
  const items: HotTapeItem[] = [];

  for (const row of rows ?? []) {
    const meta = (row.metadata_json ?? {}) as Record<string, unknown>;
    const signal = signalOf(meta);
    if (!signal) continue;

    const mint = mintOf(meta);
    if (mint && exclude.has(mint)) continue;
    const dedupeKey = mint ?? (row.title as string);
    if (seenMint.has(dedupeKey)) continue;
    seenMint.add(dedupeKey);

    const symbol =
      typeof meta.symbol === "string"
        ? meta.symbol
        : (row.title as string).replace(/^DexScreener boost:\s*/i, "").slice(0, 12);

    items.push({
      symbol,
      mint,
      title: row.title as string,
      signal,
      volumeH24:
        typeof meta.volume_h24 === "number" ? meta.volume_h24 : null,
      liquidityUsd:
        typeof meta.liquidity_usd === "number" ? meta.liquidity_usd : null,
      canonicalUrl: (row.canonical_url as string | null) ?? null,
      fetchedAt: row.fetched_at as string,
    });

    if (items.length >= HOT_TAPE_MAX_ITEMS) break;
  }

  return items;
}
