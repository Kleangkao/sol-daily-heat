import type { SupabaseClient } from "@supabase/supabase-js";
import { DEXSCREENER_SOURCE_SLUG } from "@/lib/market-pulse/constants";
import {
  mintFromMetadata,
  symbolFromMarketItem,
  upsertTopicTokenLink,
  type ExtractedToken,
} from "./link-entities";

export type TokenMintRepairResult = {
  mintsSeen: number;
  tokensCreated: number;
  topicLinksCreated: number;
  topicsTouched: number;
};

function normalizeRawJoin(raw: unknown): {
  title: string;
  metadata_json: Record<string, unknown>;
  sources: { slug: string } | null;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const src = r.sources;
  let slug: string | undefined;
  if (src && typeof src === "object" && !Array.isArray(src)) {
    slug = (src as { slug?: string }).slug;
  } else if (Array.isArray(src) && src[0] && typeof src[0] === "object") {
    slug = (src[0] as { slug?: string }).slug;
  }
  return {
    title: String(r.title ?? ""),
    metadata_json: (r.metadata_json ?? {}) as Record<string, unknown>,
    sources: slug ? { slug } : null,
  };
}

/**
 * Backfill tokens.mint_address + topic_tokens from Dex raw_items already linked via topic_sources.
 * Idempotent — safe to run after each pipeline or standalone.
 */
export async function repairTokenMintsFromTopicSources(
  db: SupabaseClient
): Promise<TokenMintRepairResult> {
  const { data: rows, error } = await db
    .from("topic_sources")
    .select(
      `topic_id,
      raw_items (
        title,
        metadata_json,
        sources ( slug )
      )`
    )
    .not("raw_item_id", "is", null);

  if (error) throw error;

  const mintsSeen = new Set<string>();
  const topicsTouched = new Set<string>();
  let tokensCreated = 0;
  let topicLinksCreated = 0;

  const byTopicMint = new Map<string, ExtractedToken>();

  for (const row of rows ?? []) {
    const topicId = (row as { topic_id: string }).topic_id;
    const raw = normalizeRawJoin((row as { raw_items: unknown }).raw_items);
    if (!raw) continue;
    const slug = raw.sources?.slug;
    if (slug !== DEXSCREENER_SOURCE_SLUG) continue;

    const meta = raw.metadata_json ?? {};
    const mint = mintFromMetadata(meta);
    if (!mint) continue;

    const key = `${topicId}:${mint}`;
    if (byTopicMint.has(key)) continue;

    byTopicMint.set(key, {
      symbol: symbolFromMarketItem(meta, raw.title),
      name:
        typeof meta.name === "string"
          ? (meta.name as string)
          : symbolFromMarketItem(meta, raw.title),
      mintAddress: mint,
      metadata: { ...meta, source_slug: slug },
      sourceSlug: slug,
    });
    mintsSeen.add(mint);
    topicsTouched.add(topicId);
  }

  for (const [key, token] of Array.from(byTopicMint.entries())) {
    const topicId = key.split(":")[0];
    const mint = token.mintAddress!;

    const { data: tokenRow } = await db
      .from("tokens")
      .select("id")
      .eq("mint_address", mint)
      .maybeSingle();

    let hadLink = false;
    if (tokenRow?.id) {
      const { data: link } = await db
        .from("topic_tokens")
        .select("id")
        .eq("topic_id", topicId)
        .eq("token_id", tokenRow.id)
        .maybeSingle();
      hadLink = Boolean(link);
    }

    const tokenId = await upsertTopicTokenLink(db, topicId, token);
    if (tokenId && !tokenRow?.id) tokensCreated += 1;
    if (tokenId && !hadLink) topicLinksCreated += 1;
  }

  return {
    mintsSeen: mintsSeen.size,
    tokensCreated,
    topicLinksCreated,
    topicsTouched: topicsTouched.size,
  };
}
