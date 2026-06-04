import type { SupabaseClient } from "@supabase/supabase-js";
import type { RelatedProject, RelatedToken } from "@/lib/types/heat";
import { DEXSCREENER_SOURCE_SLUG } from "@/lib/market-pulse/constants";

const SYMBOL_RE = /\$([A-Z]{2,10})\b/g;
const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const KNOWN_PROTOCOLS: Record<string, string> = {
  jupiter: "Jupiter",
  raydium: "Raydium",
  orca: "Orca",
  marinade: "Marinade",
  jito: "Jito",
  drift: "Drift",
  kamino: "Kamino",
  meteora: "Meteora",
  phantom: "Phantom",
};

export type ExtractedToken = RelatedToken & {
  metadata?: Record<string, unknown>;
  sourceSlug?: string;
};

type ClusterItem = {
  title: string;
  metadata_json?: Record<string, unknown>;
  sources?: { slug?: string } | null;
};

export function mintFromMetadata(metadata: Record<string, unknown>): string | null {
  const raw = metadata.mint ?? metadata.tokenAddress;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return MINT_RE.test(trimmed) ? trimmed : null;
}

function shortMint(mint: string): string {
  if (mint.length < 12) return mint;
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

/** Symbol for a Dex/market row — metadata, title, or mint shorthand. */
export function symbolFromMarketItem(
  metadata: Record<string, unknown>,
  title: string
): string {
  if (typeof metadata.symbol === "string" && metadata.symbol.length > 0) {
    return metadata.symbol.replace(/^\$/, "").slice(0, 12);
  }
  const boost = title.match(/DexScreener boost:\s*(.+)$/i);
  if (boost?.[1]) return boost[1].trim().slice(0, 12);
  const pair = title.match(/New pair:\s*([A-Za-z0-9._-]+)/i);
  if (pair?.[1]) return pair[1].replace(/^\$/, "").slice(0, 12);
  const mint = mintFromMetadata(metadata);
  if (mint) return shortMint(mint);
  return "SPL";
}

function mergeTokenMetadata(
  existing: Record<string, unknown> | undefined,
  incoming: Record<string, unknown>,
  sourceSlug?: string
): Record<string, unknown> {
  return {
    ...existing,
    ...incoming,
    ...(sourceSlug ? { source_slug: sourceSlug } : {}),
  };
}

/** Collect mint-backed tokens from all cluster raw items (Dex metadata). */
function tokensFromClusterItems(items: ClusterItem[]): ExtractedToken[] {
  const byMint = new Map<string, ExtractedToken>();

  for (const item of items) {
    const meta = item.metadata_json ?? {};
    const mint = mintFromMetadata(meta);
    if (!mint || byMint.has(mint)) continue;

    const sourceSlug = item.sources?.slug;
    byMint.set(mint, {
      symbol: symbolFromMarketItem(meta, item.title),
      name:
        typeof meta.name === "string"
          ? (meta.name as string)
          : symbolFromMarketItem(meta, item.title),
      mintAddress: mint,
      metadata: mergeTokenMetadata(undefined, meta, sourceSlug),
      sourceSlug,
    });
  }

  return Array.from(byMint.values());
}

export function extractEntities(text: string, metadata: Record<string, unknown>): {
  tokens: RelatedToken[];
  projects: RelatedProject[];
} {
  const fromCluster = extractEntitiesFromCluster([{ title: "", metadata_json: metadata }], text);
  return { tokens: fromCluster.tokens, projects: fromCluster.projects };
}

/** Extract tokens/projects from a topic cluster; prefers mint-backed Dex rows. */
export function extractEntitiesFromCluster(
  items: ClusterItem[],
  text: string
): {
  tokens: ExtractedToken[];
  projects: RelatedProject[];
} {
  const projects: RelatedProject[] = [];
  const byMint = new Map<string, ExtractedToken>();
  const symbolOnly = new Map<string, ExtractedToken>();
  const seenSym = new Set<string>();

  for (const t of tokensFromClusterItems(items)) {
    if (t.mintAddress) byMint.set(t.mintAddress, t);
  }

  const primaryMeta = items[0]?.metadata_json ?? {};
  if (typeof primaryMeta.symbol === "string") {
    const sym = primaryMeta.symbol.replace(/^\$/, "").slice(0, 12);
    const mint = mintFromMetadata(primaryMeta);
    if (mint) {
      const existing = byMint.get(mint);
      byMint.set(mint, {
        symbol: sym,
        name: typeof primaryMeta.name === "string" ? (primaryMeta.name as string) : sym,
        mintAddress: mint,
        metadata: mergeTokenMetadata(existing?.metadata, primaryMeta, existing?.sourceSlug),
        sourceSlug: existing?.sourceSlug ?? items[0]?.sources?.slug,
      });
    }
  }

  let m: RegExpExecArray | null;
  while ((m = SYMBOL_RE.exec(text)) !== null) {
    const sym = m[1];
    if (seenSym.has(sym)) continue;
    seenSym.add(sym);
    const boundToMint = Array.from(byMint.values()).some((t) => t.symbol === sym);
    if (!boundToMint) {
      symbolOnly.set(sym, { symbol: sym });
    }
  }

  const lower = text.toLowerCase();
  for (const [slug, name] of Object.entries(KNOWN_PROTOCOLS)) {
    if (lower.includes(slug)) {
      projects.push({ name, slug, type: "protocol" });
    }
  }

  for (const item of items) {
    const meta = item.metadata_json ?? {};
    if (typeof meta.defillama_id === "string") {
      projects.push({
        name: String(meta.name ?? meta.defillama_id),
        slug: meta.defillama_id as string,
        type: "protocol",
      });
    }
  }

  const mints = text.match(/\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/g) ?? [];
  for (const mint of mints) {
    if (!MINT_RE.test(mint) || byMint.has(mint)) continue;
    byMint.set(mint, {
      symbol: shortMint(mint),
      mintAddress: mint,
      metadata: { mint },
    });
  }

  const tokens = [
    ...Array.from(byMint.values()),
    ...Array.from(symbolOnly.values()).filter(
      (t) => !Array.from(byMint.values()).some((m) => m.symbol === t.symbol)
    ),
  ];

  return { tokens: tokens.slice(0, 8), projects: projects.slice(0, 5) };
}

/** Upsert token row and prefer mint-backed identity; avoid cross-mint symbol merges. */
export async function upsertTopicTokenLink(
  db: SupabaseClient,
  topicId: string,
  token: ExtractedToken
): Promise<string | null> {
  const meta = token.metadata ?? {};
  const sourceSlug = token.sourceSlug ?? (meta.source_slug as string | undefined);

  if (token.mintAddress) {
    const { data: byMint, error: mintErr } = await db
      .from("tokens")
      .upsert(
        {
          symbol: token.symbol,
          name: token.name ?? token.symbol,
          mint_address: token.mintAddress,
          chain: "solana",
          metadata_json: mergeTokenMetadata({}, meta, sourceSlug),
        },
        { onConflict: "mint_address" }
      )
      .select("id, metadata_json")
      .maybeSingle();

    if (mintErr) return null;

    let tokenId = byMint?.id;
    if (tokenId && Object.keys(meta).length > 0) {
      const merged = mergeTokenMetadata(
        (byMint?.metadata_json ?? {}) as Record<string, unknown>,
        meta,
        sourceSlug
      );
      await db.from("tokens").update({ metadata_json: merged }).eq("id", tokenId);
    }

    if (!tokenId) {
      const { data: symRows } = await db
        .from("tokens")
        .select("id, mint_address")
        .eq("symbol", token.symbol)
        .is("mint_address", null)
        .limit(2);

      if (symRows?.length === 1) {
        const { data: upgraded } = await db
          .from("tokens")
          .update({
            mint_address: token.mintAddress,
            name: token.name ?? token.symbol,
            metadata_json: mergeTokenMetadata(
              {},
              meta,
              sourceSlug ?? DEXSCREENER_SOURCE_SLUG
            ),
          })
          .eq("id", symRows[0].id as string)
          .select("id")
          .maybeSingle();
        tokenId = upgraded?.id ?? (symRows[0].id as string);
      }
    }

    if (tokenId) {
      await db.from("topic_tokens").upsert(
        { topic_id: topicId, token_id: tokenId, relation_type: "mentioned" },
        { onConflict: "topic_id,token_id" }
      );
    }
    return tokenId ?? null;
  }

  const { data: symRow } = await db
    .from("tokens")
    .select("id")
    .eq("symbol", token.symbol)
    .is("mint_address", null)
    .limit(1)
    .maybeSingle();

  let tokenId = symRow?.id as string | undefined;
  if (!tokenId) {
    const { data: ins, error } = await db
      .from("tokens")
      .insert({
        symbol: token.symbol,
        name: token.name ?? token.symbol,
        mint_address: null,
        chain: "solana",
        metadata_json: meta,
      })
      .select("id")
      .single();
    if (error) return null;
    tokenId = ins?.id;
  }

  if (tokenId) {
    await db.from("topic_tokens").upsert(
      { topic_id: topicId, token_id: tokenId, relation_type: "mentioned" },
      { onConflict: "topic_id,token_id" }
    );
  }
  return tokenId ?? null;
}
