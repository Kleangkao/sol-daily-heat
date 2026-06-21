import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { deriveTokenBadges } from "@/lib/heat/token-detail-labels";
import { DEXSCREENER_SOURCE_SLUG } from "@/lib/market-pulse/constants";
import { readHotTapeSnapshot, readWatchlistSnapshot } from "@/lib/market-pulse/snapshots";
import type { HotTapeItem, PulseTokenLabel, PulseTokenRow } from "@/lib/market-pulse/types";
import { SECTION_LABELS } from "@/lib/types/heat";
import {
  HOT_ON_SOLANA,
  NEW_AND_TRENDING,
  PRODUCT_NAME,
} from "@/lib/product/copy";
import type {
  Protocol,
  RankingSection,
  RankingStatus,
  Token,
  Topic,
} from "@/lib/types/db";
import type {
  TokenDetailProtocol,
  TokenDetailView,
  TokenMarketSnapshot,
  TokenRelatedTopic,
  TokenTimelineEntry,
} from "@/lib/types/token-detail";

const DEX_LOOKBACK_DAYS = 7;

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function cutoffIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function mintFromMeta(meta: Record<string, unknown>): string | null {
  const raw = meta.mint ?? meta.tokenAddress;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function shortMint(mint: string): string {
  if (mint.length < 12) return mint;
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

type DexSignalState = {
  hasBoost: boolean;
  hasNewPair: boolean;
  liquidityUsd: number | null;
  volumeH24: number | null;
  canonicalUrl: string | null;
  symbol: string | null;
};

type TopicTokenRow = {
  topics: Topic & {
    daily_rankings?: Array<{
      ranking_date: string;
      section: RankingSection;
      heat_score: number;
      rank_position: number | null;
      status: RankingStatus;
    }>;
    topic_protocols?: Array<{ protocols: Protocol | null }>;
    topic_sources?: Array<{
      id: string;
      raw_item_id: string | null;
      source_url: string | null;
      sources: { slug: string; name: string } | null;
      raw_items: {
        id: string;
        title: string;
        canonical_url: string | null;
        published_at: string | null;
        fetched_at: string;
        metadata_json: Record<string, unknown>;
      } | null;
    }>;
  };
};

async function loadDexItemsForMint(
  admin: SupabaseClient,
  mint: string
): Promise<
  Array<{
    id: string;
    title: string;
    canonical_url: string | null;
    published_at: string | null;
    fetched_at: string;
    metadata_json: Record<string, unknown>;
    sourceName: string;
    sourceSlug: string;
  }>
> {
  const { data: source } = await admin
    .from("sources")
    .select("id, name, slug")
    .eq("slug", DEXSCREENER_SOURCE_SLUG)
    .maybeSingle();

  if (!source?.id) return [];

  const { data: rows } = await admin
    .from("raw_items")
    .select("id, title, canonical_url, published_at, fetched_at, metadata_json")
    .eq("source_id", source.id)
    .gte("fetched_at", cutoffIso(DEX_LOOKBACK_DAYS))
    .order("fetched_at", { ascending: false })
    .limit(200);

  const out: Array<{
    id: string;
    title: string;
    canonical_url: string | null;
    published_at: string | null;
    fetched_at: string;
    metadata_json: Record<string, unknown>;
    sourceName: string;
    sourceSlug: string;
  }> = [];

  for (const row of rows ?? []) {
    const meta = (row.metadata_json ?? {}) as Record<string, unknown>;
    if (mintFromMeta(meta) !== mint) continue;
    out.push({
      id: row.id as string,
      title: row.title as string,
      canonical_url: row.canonical_url as string | null,
      published_at: row.published_at as string | null,
      fetched_at: row.fetched_at as string,
      metadata_json: meta,
      sourceName: (source.name as string) ?? "DexScreener",
      sourceSlug: (source.slug as string) ?? DEXSCREENER_SOURCE_SLUG,
    });
  }

  return out;
}

type DexItemRow = Awaited<ReturnType<typeof loadDexItemsForMint>>[number];

function mergeDexSignals(items: DexItemRow[]): DexSignalState {
  const state: DexSignalState = {
    hasBoost: false,
    hasNewPair: false,
    liquidityUsd: null,
    volumeH24: null,
    canonicalUrl: null,
    symbol: null,
  };

  for (const row of items) {
    const meta = row.metadata_json;
    const signal = meta.signal;
    if (signal === "boost") state.hasBoost = true;
    if (signal === "new_pair") state.hasNewPair = true;
    const liq = num(meta.liquidity_usd);
    if (liq != null) state.liquidityUsd = liq;
    const vol = num(meta.volume_h24);
    if (vol != null) state.volumeH24 = vol;
    if (typeof meta.symbol === "string" && meta.symbol.length > 0) {
      state.symbol = meta.symbol.replace(/^\$/, "").slice(0, 12);
    }
    if (row.canonical_url) state.canonicalUrl = row.canonical_url;
  }

  return state;
}

function buildRelatedTopics(
  topicLinks: TopicTokenRow[],
  rankingDate: string
): TokenRelatedTopic[] {
  const byTopic = new Map<string, TokenRelatedTopic>();

  for (const link of topicLinks) {
    const topic = link.topics;
    if (!topic?.id) continue;

    const rankings = (topic.daily_rankings ?? []).filter((r) => r.status === "published");
    const todayRankings = rankings.filter((r) => r.ranking_date === rankingDate);
    const useRankings = todayRankings.length > 0 ? todayRankings : rankings.slice(0, 6);
    if (useRankings.length === 0) continue;

    const maxHeat = Math.max(...useRankings.map((r) => Number(r.heat_score)));
    const latestDate = useRankings.reduce(
      (best, r) => (r.ranking_date > best ? r.ranking_date : best),
      useRankings[0].ranking_date
    );

    const sections = useRankings
      .filter((r) => r.ranking_date === latestDate)
      .map((r) => ({
        section: r.section,
        sectionLabel: SECTION_LABELS[r.section] ?? r.section,
        rankPosition: r.rank_position != null ? Number(r.rank_position) : null,
        heatScore: Number(r.heat_score),
      }));

    const existing = byTopic.get(topic.id);
    if (!existing || latestDate > existing.rankingDate || maxHeat > existing.heatScore) {
      byTopic.set(topic.id, {
        id: topic.id,
        title: topic.title,
        category: topic.category,
        heatScore: maxHeat,
        rankingDate: latestDate,
        sections,
      });
    }
  }

  return Array.from(byTopic.values()).sort((a, b) => {
    if (a.rankingDate !== b.rankingDate) return b.rankingDate.localeCompare(a.rankingDate);
    return b.heatScore - a.heatScore;
  });
}

function collectProtocols(topicLinks: TopicTokenRow[]): TokenDetailProtocol[] {
  const seen = new Set<string>();
  const out: TokenDetailProtocol[] = [];
  for (const link of topicLinks) {
    for (const tp of link.topics?.topic_protocols ?? []) {
      const p = tp.protocols;
      if (!p?.slug || seen.has(p.slug)) continue;
      seen.add(p.slug);
      out.push({
        name: p.name ?? "Unknown",
        slug: p.slug,
        category: p.category ?? null,
        websiteUrl: p.website_url ?? null,
      });
    }
  }
  return out;
}

function buildTimeline(
  dexItems: Awaited<ReturnType<typeof loadDexItemsForMint>>,
  topicLinks: TopicTokenRow[]
): TokenTimelineEntry[] {
  const map = new Map<string, TokenTimelineEntry>();

  for (const row of dexItems) {
    const meta = row.metadata_json;
    const signal = typeof meta.signal === "string" ? meta.signal : null;
    const labels: string[] = [];
    if (signal) labels.push(signal);
    if (meta.sitemap_discovery === true) labels.push("headline-only");

    map.set(row.id, {
      id: row.id,
      sourceName: row.sourceName,
      sourceSlug: row.sourceSlug,
      title: row.title,
      url:
        row.canonical_url && /^https?:\/\//i.test(row.canonical_url) ? row.canonical_url : null,
      publishedAt: row.published_at,
      fetchedAt: row.fetched_at,
      itemType: (meta.item_type as string) ?? "market",
      signal,
      signalLabels: labels,
    });
  }

  for (const link of topicLinks) {
    for (const ts of link.topics?.topic_sources ?? []) {
      const raw = ts.raw_items;
      if (!raw?.id || map.has(raw.id)) continue;
      const meta = (raw.metadata_json ?? {}) as Record<string, unknown>;
      const signal = typeof meta.signal === "string" ? meta.signal : null;
      map.set(raw.id, {
        id: raw.id,
        sourceName: ts.sources?.name ?? "Source",
        sourceSlug: ts.sources?.slug ?? "unknown",
        title: raw.title,
        url:
          (raw.canonical_url && /^https?:\/\//i.test(raw.canonical_url)
            ? raw.canonical_url
            : null) ??
          (ts.source_url && /^https?:\/\//i.test(ts.source_url) ? ts.source_url : null),
        publishedAt: raw.published_at,
        fetchedAt: raw.fetched_at,
        itemType: (meta.item_type as string) ?? "news",
        signal,
        signalLabels: signal ? [signal] : [],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.publishedAt ?? a.fetchedAt).getTime();
    const tb = new Date(b.publishedAt ?? b.fetchedAt).getTime();
    return tb - ta;
  });
}

function buildScannerContext(input: {
  dex: DexSignalState;
  inTopHeat: boolean;
  inNewTokens: boolean;
  pulseRoles: TokenDetailView["pulseRoles"];
  relatedTopicCount: number;
}): string[] {
  const lines: string[] = [];
  if (input.dex.hasBoost) {
    lines.push("Discovered via DexScreener paid boost signal in today's ingest window.");
  }
  if (input.dex.hasNewPair) {
    lines.push("Discovered as a new Solana pair signal from DexScreener.");
  }
  if (input.pulseRoles.includes("anchor") || input.pulseRoles.includes("hot_tokens")) {
    lines.push("Appeared in today's Market Pulse hot-token watchlist snapshot.");
  }
  if (input.pulseRoles.includes("hot_tape")) {
    lines.push("Listed on today's Market Pulse scanner signals tape.");
  }
  if (input.inNewTokens) {
    lines.push(`Linked to a topic ranked in ${NEW_AND_TRENDING.rankingSectionLabel}.`);
  }
  if (input.inTopHeat) {
    lines.push(`Linked to a topic ranked in ${HOT_ON_SOLANA.rankingSectionLabel}.`);
  }
  if (input.relatedTopicCount > 0 && !input.inNewTokens && !input.inTopHeat) {
    lines.push(`Mentioned in ${input.relatedTopicCount} ranked topic(s) in ${PRODUCT_NAME}.`);
  }
  if (lines.length === 0) {
    lines.push("No stored scanner placement for this mint yet. Verify on external explorers.");
  }
  return lines;
}

function buildRiskNotes(input: {
  badges: PulseTokenLabel[];
  uniqueSourceCount: number;
}): string[] {
  const notes: string[] = [];
  if (input.badges.includes("Promoted boost")) {
    notes.push("Paid visibility signal; not organic endorsement.");
  }
  if (input.badges.includes("Pump.fun style")) {
    notes.push("Pump.fun-style mint; high-risk market signal.");
  }
  if (input.badges.includes("Low liquidity")) {
    notes.push("Low liquidity can increase volatility and execution risk.");
  }
  if (input.uniqueSourceCount <= 1) {
    notes.push("Single-source signal; verify before acting.");
  }
  notes.push("Token context only. Not investment advice.");
  return notes;
}

function matchPulse(
  mint: string,
  watch: Awaited<ReturnType<typeof readWatchlistSnapshot>>,
  hotTape: Awaited<ReturnType<typeof readHotTapeSnapshot>>
): {
  pulseRoles: TokenDetailView["pulseRoles"];
  pulseLabels: PulseTokenLabel[];
  marketSnapshot: TokenMarketSnapshot | null;
  inTopHeat: boolean;
  inNewTokens: boolean;
} {
  const pulseRoles: TokenDetailView["pulseRoles"] = [];
  const pulseLabels: PulseTokenLabel[] = [];
  let marketSnapshot: TokenMarketSnapshot | null = null;
  let inTopHeat = false;
  let inNewTokens = false;

  if (watch) {
    const v2 = watch.payload_json;
    const checkRow = (row: PulseTokenRow, role: "anchor" | "hot_tokens") => {
      if (row.mint !== mint) return;
      pulseRoles.push(role);
      pulseLabels.push(...row.labels);
      if (row.labels.includes("Mentioned in Top Heat")) inTopHeat = true;
      if (row.labels.includes("In New Tokens Today")) inNewTokens = true;
      marketSnapshot = {
        priceUsd: row.priceUsd ?? null,
        change24hPct: row.change24hPct ?? null,
        liquidityUsd: row.liquidityUsd ?? null,
        volumeH24: null,
        fetchedAt: watch.fetched_at,
        source: "watchlist",
      };
    };
    checkRow(v2.anchor, "anchor");
    for (const row of v2.hotTokens) checkRow(row, "hot_tokens");
  }

  if (hotTape) {
    const tape = hotTape.payload_json as HotTapeItem[];
    const item = tape.find((t) => t.mint === mint);
    if (item) {
      if (!pulseRoles.includes("hot_tape")) pulseRoles.push("hot_tape");
      if (!marketSnapshot) {
        marketSnapshot = {
          priceUsd: null,
          change24hPct: null,
          liquidityUsd: item.liquidityUsd ?? null,
          volumeH24: item.volumeH24 ?? null,
          fetchedAt: hotTape.fetched_at,
          source: "hot_tape",
        };
      } else {
        const snap: TokenMarketSnapshot = marketSnapshot;
        marketSnapshot = {
          ...snap,
          volumeH24: snap.volumeH24 ?? item.volumeH24 ?? null,
          liquidityUsd: snap.liquidityUsd ?? item.liquidityUsd ?? null,
        };
      }
    }
  }

  return { pulseRoles, pulseLabels, marketSnapshot, inTopHeat, inNewTokens };
}

function symbolFromPulse(
  mint: string,
  watch: Awaited<ReturnType<typeof readWatchlistSnapshot>>,
  hotTape: Awaited<ReturnType<typeof readHotTapeSnapshot>>
): { symbol: string | null; canonicalUrl: string | null } {
  if (watch) {
    const rows = [watch.payload_json.anchor, ...watch.payload_json.hotTokens];
    const row = rows.find((r) => r.mint === mint);
    if (row) {
      return { symbol: row.symbol, canonicalUrl: row.canonicalUrl ?? null };
    }
  }
  if (hotTape) {
    const item = (hotTape.payload_json as HotTapeItem[]).find((t) => t.mint === mint);
    if (item) {
      return { symbol: item.symbol, canonicalUrl: item.canonicalUrl ?? null };
    }
  }
  return { symbol: null, canonicalUrl: null };
}

export async function getTokenDetail(
  db: SupabaseClient,
  mint: string,
  rankingDate?: string
): Promise<TokenDetailView | null> {
  const date = rankingDate ?? todayDate();
  const admin = getSupabaseAdmin();

  const { data: tokenRow, error: tokenErr } = await db
    .from("tokens")
    .select(
      `*,
      topic_tokens (
        topics (
          id,
          title,
          category,
          daily_rankings (
            ranking_date,
            section,
            heat_score,
            rank_position,
            status
          ),
          topic_protocols ( protocols ( slug, name, category, website_url ) ),
          topic_sources (
            id,
            source_url,
            raw_item_id,
            sources ( slug, name ),
            raw_items (
              id,
              title,
              canonical_url,
              published_at,
              fetched_at,
              metadata_json
            )
          )
        )
      )`
    )
    .eq("mint_address", mint)
    .maybeSingle();

  if (tokenErr) return null;

  const dexItems = admin ? await loadDexItemsForMint(admin, mint) : [];
  const dex = mergeDexSignals(dexItems);

  const token = tokenRow as
    | (Token & { topic_tokens?: TopicTokenRow[] })
    | null;

  let watch = null;
  let hotTape = null;
  try {
    watch = await readWatchlistSnapshot(db);
    hotTape = await readHotTapeSnapshot(db);
  } catch {
    /* snapshots optional */
  }

  const pulse = matchPulse(mint, watch, hotTape);
  const pulseSymbol = symbolFromPulse(mint, watch, hotTape);

  if (!token && dexItems.length === 0 && pulse.pulseRoles.length === 0) {
    return null;
  }

  const topicLinks = token?.topic_tokens ?? [];
  const relatedTopics = buildRelatedTopics(topicLinks, date);
  const inTopHeatFromTopics = relatedTopics.some((t) =>
    t.sections.some((s) => s.section === "top_heat")
  );
  const inNewTokensFromTopics = relatedTopics.some((t) =>
    t.sections.some((s) => s.section === "new_tokens")
  );
  const inTopHeat = pulse.inTopHeat || inTopHeatFromTopics;
  const inNewTokens = pulse.inNewTokens || inNewTokensFromTopics;

  const symbol =
    token?.symbol?.replace(/^\$/, "") ??
    dex.symbol ??
    pulseSymbol.symbol ??
    shortMint(mint);

  const badges = deriveTokenBadges({
    symbol,
    mint,
    pulseLabels: pulse.pulseLabels,
    hasBoost: dex.hasBoost,
    hasNewPair: dex.hasNewPair,
    inTopHeat,
    inNewTokens,
    liquidityUsd: dex.liquidityUsd ?? pulse.marketSnapshot?.liquidityUsd ?? null,
    isKnownToken: pulse.pulseLabels.includes("Known token"),
  });

  const timeline = buildTimeline(dexItems, topicLinks);
  const sourceSlugs = new Set(timeline.map((t) => t.sourceSlug));

  const dexScreenerUrl =
    dex.canonicalUrl ??
    pulseSymbol.canonicalUrl ??
    `https://dexscreener.com/solana/${mint}`;

  return {
    mint,
    symbol,
    name: token?.name ?? null,
    tokenId: token?.id ?? null,
    firstSeenAt: token?.first_seen_at ?? dexItems[0]?.fetched_at ?? null,
    badges,
    marketSnapshot: pulse.marketSnapshot,
    pulseRoles: pulse.pulseRoles,
    scannerContext: buildScannerContext({
      dex,
      inTopHeat,
      inNewTokens,
      pulseRoles: pulse.pulseRoles,
      relatedTopicCount: relatedTopics.length,
    }),
    relatedTopics,
    timeline,
    protocols: collectProtocols(topicLinks),
    riskNotes: buildRiskNotes({
      badges,
      uniqueSourceCount: sourceSlugs.size,
    }),
    dexScreenerUrl,
    uniqueSourceCount: sourceSlugs.size,
  };
}
