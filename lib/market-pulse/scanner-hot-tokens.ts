import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEXSCREENER_SOURCE_SLUG,
  HOT_TAPE_WINDOW_MS,
  LOW_LIQUIDITY_USD,
  MAX_DYNAMIC_HOT_TOKENS,
  MAX_LOW_OR_UNKNOWN_LIQ_SLOTS,
  MAX_PROMOTED_BOOST_SLOTS,
  MAX_PUMP_STYLE_SLOTS_DEFAULT,
  MAX_PUMP_STYLE_SLOTS_ELEVATED,
  MIN_DYNAMIC_BEFORE_ALLOWLIST,
  PUMP_STYLE_ELEVATED_LIQ_USD,
  PUMP_STYLE_MEANINGFUL_VOLUME_H24,
  SCORE_BOOST,
  SCORE_HIGH_LIQ,
  SCORE_IN_NEW_TOKENS,
  SCORE_IN_TOP_HEAT,
  SCORE_LOW_LIQ,
  SCORE_NEW_PAIR,
  SCORE_PUMP_STYLE_PENALTY,
  SCORE_SPAM_BLOCK,
  SOL_MINT,
} from "@/lib/market-pulse/constants";
import { KNOWN_TOKEN_ALLOWLIST } from "@/lib/market-pulse/known-token-allowlist";
import { SOL_SYMBOL } from "@/lib/market-pulse/watchlist-mints";
import type { PulseTokenLabel, PulseTokenRow } from "@/lib/market-pulse/types";

const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type Candidate = {
  mint: string;
  symbol: string;
  canonicalUrl: string | null;
  labels: Set<PulseTokenLabel>;
  liquidityUsd: number | null;
  volumeH24: number | null;
  signal: "boost" | "new_pair" | null;
  topicIds: Set<string>;
  fetchedAt: string;
  hasNewPair: boolean;
  hasBoost: boolean;
  inNewTokens: boolean;
  inTopHeat: boolean;
  isKnownFallback: boolean;
  score: number;
};

function cutoffIso(): string {
  return new Date(Date.now() - HOT_TAPE_WINDOW_MS).toISOString();
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidMint(mint: string): boolean {
  return mint !== SOL_MINT && MINT_RE.test(mint);
}

function shortMint(mint: string): string {
  if (mint.length < 12) return mint;
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

/** pump.fun-style mint/symbol — penalized and capped, not hard-blocked. */
function isPumpStyleMintOrSymbol(mint: string, symbol: string): boolean {
  const m = mint.toLowerCase();
  const s = symbol.toLowerCase();
  if (m.endsWith("pump")) return true;
  if (s.endsWith("pump") && s.length <= 12) return true;
  return false;
}

/** Obvious scam/spam beyond pump.fun-style suffix (still hard-blocked). */
function isHardSpamMintOrSymbol(mint: string, symbol: string): boolean {
  const s = symbol.trim().toLowerCase();
  if (s === "rug" || s === "scam" || s === "honeypot") return true;
  if (/^(.)\1{6,}$/i.test(mint)) return true;
  return false;
}

function qualifiesForSecondPumpSlot(c: Candidate): boolean {
  return (
    (c.liquidityUsd ?? 0) >= PUMP_STYLE_ELEVATED_LIQ_USD ||
    (c.volumeH24 ?? 0) >= PUMP_STYLE_MEANINGFUL_VOLUME_H24
  );
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function getOrCreate(map: Map<string, Candidate>, mint: string): Candidate {
  let c = map.get(mint);
  if (!c) {
    c = {
      mint,
      symbol: shortMint(mint),
      canonicalUrl: null,
      labels: new Set(),
      liquidityUsd: null,
      volumeH24: null,
      signal: null,
      topicIds: new Set(),
      fetchedAt: new Date(0).toISOString(),
      hasNewPair: false,
      hasBoost: false,
      inNewTokens: false,
      inTopHeat: false,
      isKnownFallback: false,
      score: 0,
    };
    map.set(mint, c);
  }
  return c;
}

function mergeFetchedAt(c: Candidate, iso: string): void {
  if (iso > c.fetchedAt) c.fetchedAt = iso;
}

function computeScore(c: Candidate): number {
  let score = 0;
  if (c.hasNewPair) score += SCORE_NEW_PAIR;
  if (c.inNewTokens) score += SCORE_IN_NEW_TOKENS;
  if (c.inTopHeat) score += SCORE_IN_TOP_HEAT;
  if (c.hasBoost) score += SCORE_BOOST;
  if (c.liquidityUsd != null) {
    if (c.liquidityUsd >= LOW_LIQUIDITY_USD) score += SCORE_HIGH_LIQ;
    else score += SCORE_LOW_LIQ;
  }
  if (isHardSpamMintOrSymbol(c.mint, c.symbol)) score += SCORE_SPAM_BLOCK;
  else if (isPumpStyleMintOrSymbol(c.mint, c.symbol)) score += SCORE_PUMP_STYLE_PENALTY;
  return score;
}

function finalizeLabels(c: Candidate): PulseTokenLabel[] {
  const labels: PulseTokenLabel[] = [];
  const pumpStyle = isPumpStyleMintOrSymbol(c.mint, c.symbol);

  if (c.isKnownFallback) labels.push("Known token");
  if (pumpStyle) {
    labels.push("Pump.fun style", "High risk", "Market signal only");
  }
  if (c.hasBoost) labels.push("Promoted boost");
  if (c.hasNewPair) labels.push("New pair");
  if (c.inTopHeat) labels.push("Mentioned in Top Heat");
  if (c.inNewTokens) labels.push("In New Tokens Today");
  if (
    c.liquidityUsd != null &&
    c.liquidityUsd < LOW_LIQUIDITY_USD &&
    !labels.includes("Low liquidity")
  ) {
    labels.push("Low liquidity");
  }
  if (labels.length === 0 && c.isKnownFallback) return ["Known token"];
  return labels;
}

function candidateToRow(c: Candidate): PulseTokenRow {
  const labels = finalizeLabels(c);
  const ensured: PulseTokenLabel[] =
    labels.length > 0
      ? [...labels]
      : c.isKnownFallback
        ? ["Known token"]
        : [];
  return {
    symbol: c.symbol,
    mint: c.mint,
    priceUsd: null,
    change24hPct: null,
    liquidityUsd: c.liquidityUsd,
    labels: ensured,
    canonicalUrl: c.canonicalUrl,
  };
}

function isLowOrUnknownLiq(c: Candidate): boolean {
  return c.liquidityUsd == null || c.liquidityUsd < LOW_LIQUIDITY_USD;
}

function isBoostCandidate(c: Candidate): boolean {
  return c.hasBoost || c.labels.has("Promoted boost");
}

type SelectionCapStats = {
  excluded_spam_count: number;
  excluded_low_liq_count: number;
  excluded_boost_cap_count: number;
  excluded_pump_cap_count: number;
  selected_pump_style_count: number;
};

function selectWithCaps(
  sorted: Candidate[],
  onlyNonFallback: boolean
): { picked: Candidate[]; stats: SelectionCapStats } {
  const picked: Candidate[] = [];
  let boostCount = 0;
  let lowLiqCount = 0;
  let pumpStyleCount = 0;
  const stats: SelectionCapStats = {
    excluded_spam_count: 0,
    excluded_low_liq_count: 0,
    excluded_boost_cap_count: 0,
    excluded_pump_cap_count: 0,
    selected_pump_style_count: 0,
  };

  for (const c of sorted) {
    if (onlyNonFallback && c.isKnownFallback) continue;
    if (picked.length >= MAX_DYNAMIC_HOT_TOKENS) break;
    if (c.score <= SCORE_SPAM_BLOCK / 2 || isHardSpamMintOrSymbol(c.mint, c.symbol)) {
      stats.excluded_spam_count += 1;
      continue;
    }

    const pumpStyle = isPumpStyleMintOrSymbol(c.mint, c.symbol);
    if (pumpStyle) {
      if (pumpStyleCount >= MAX_PUMP_STYLE_SLOTS_ELEVATED) {
        stats.excluded_pump_cap_count += 1;
        continue;
      }
      if (
        pumpStyleCount >= MAX_PUMP_STYLE_SLOTS_DEFAULT &&
        !qualifiesForSecondPumpSlot(c)
      ) {
        stats.excluded_pump_cap_count += 1;
        continue;
      }
    }

    const boost = isBoostCandidate(c);
    const lowLiq = isLowOrUnknownLiq(c);
    if (boost && boostCount >= MAX_PROMOTED_BOOST_SLOTS) {
      stats.excluded_boost_cap_count += 1;
      continue;
    }
    if (lowLiq && lowLiqCount >= MAX_LOW_OR_UNKNOWN_LIQ_SLOTS) {
      stats.excluded_low_liq_count += 1;
      continue;
    }

    picked.push(c);
    if (boost) boostCount += 1;
    if (lowLiq) lowLiqCount += 1;
    if (pumpStyle) {
      pumpStyleCount += 1;
      stats.selected_pump_style_count += 1;
    }
  }

  return { picked, stats };
}

async function loadDexCandidates(
  db: SupabaseClient,
  map: Map<string, Candidate>
): Promise<void> {
  const { data: source } = await db
    .from("sources")
    .select("id")
    .eq("slug", DEXSCREENER_SOURCE_SLUG)
    .maybeSingle();

  if (!source?.id) return;

  const { data: rows } = await db
    .from("raw_items")
    .select("title, canonical_url, fetched_at, metadata_json")
    .eq("source_id", source.id)
    .gte("fetched_at", cutoffIso())
    .order("fetched_at", { ascending: false })
    .limit(100);

  for (const row of rows ?? []) {
    const meta = (row.metadata_json ?? {}) as Record<string, unknown>;
    const signal = meta.signal;
    if (signal !== "boost" && signal !== "new_pair") continue;

    const mintRaw = meta.mint ?? meta.tokenAddress;
    if (typeof mintRaw !== "string" || !isValidMint(mintRaw)) continue;

    const c = getOrCreate(map, mintRaw);
    const fetched = row.fetched_at as string;
    mergeFetchedAt(c, fetched);

    if (signal === "boost") {
      c.hasBoost = true;
      c.signal = "boost";
    }
    if (signal === "new_pair") {
      c.hasNewPair = true;
      c.signal = "new_pair";
    }

    if (typeof meta.symbol === "string" && meta.symbol.length > 0) {
      c.symbol = meta.symbol.replace(/^\$/, "").slice(0, 12);
    } else if (signal === "boost") {
      c.symbol = shortMint(mintRaw);
    }

    const liq = num(meta.liquidity_usd);
    if (liq != null) c.liquidityUsd = liq;
    const vol = num(meta.volume_h24);
    if (vol != null) c.volumeH24 = vol;

    if (typeof row.canonical_url === "string") c.canonicalUrl = row.canonical_url;
  }
}

async function loadRankingCandidates(
  db: SupabaseClient,
  rankingDate: string,
  section: "new_tokens" | "top_heat",
  map: Map<string, Candidate>
): Promise<void> {
  let query = db
    .from("daily_rankings")
    .select(
      `topic_id, rank_position, topics (
        topic_tokens ( tokens ( symbol, mint_address ) )
      )`
    )
    .eq("ranking_date", rankingDate)
    .eq("status", "published")
    .eq("section", section);

  if (section === "top_heat") {
    query = query.lte("rank_position", 5);
  }

  const { data: rows } = await query;

  for (const row of rows ?? []) {
    const topicId = row.topic_id as string;
    const t = row.topics as {
      topic_tokens?: Array<{ tokens?: { symbol?: string; mint_address?: string | null } }>;
    };
    for (const tt of t?.topic_tokens ?? []) {
      const tok = tt.tokens;
      const mint = tok?.mint_address;
      if (!mint || !isValidMint(mint)) continue;

      const c = getOrCreate(map, mint);
      if (tok?.symbol) c.symbol = tok.symbol.replace(/^\$/, "").slice(0, 12);
      c.topicIds.add(topicId);
      if (section === "new_tokens") c.inNewTokens = true;
      if (section === "top_heat") c.inTopHeat = true;
    }
  }
}

export type ScannerSelectionDebug = {
  candidate_count: number;
  selected_dynamic_count: number;
  fallback_count: number;
  pump_style_count: number;
  selected_pump_style_count: number;
  excluded_spam_count: number;
  excluded_low_liq_count: number;
  excluded_boost_cap_count: number;
  excluded_pump_cap_count: number;
  selected_symbols: string;
  fallback_symbols: string;
  ranking_date_used: string;
  filter_note: string;
};

export type ScannerHotTokensResult = {
  anchor: PulseTokenRow;
  hotTokens: PulseTokenRow[];
  dynamicCount: number;
  fallbackCount: number;
  debug: ScannerSelectionDebug;
};

async function resolveRankingDate(db: SupabaseClient, explicit?: string): Promise<string> {
  if (explicit) return explicit;
  const { data } = await db
    .from("daily_rankings")
    .select("ranking_date")
    .eq("status", "published")
    .order("ranking_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.ranking_date as string | undefined) ?? todayDate();
}

export async function buildScannerHotTokens(
  db: SupabaseClient,
  rankingDate?: string
): Promise<ScannerHotTokensResult> {
  const date = await resolveRankingDate(db, rankingDate);
  const map = new Map<string, Candidate>();

  await loadDexCandidates(db, map);
  await loadRankingCandidates(db, date, "new_tokens", map);
  await loadRankingCandidates(db, date, "top_heat", map);

  for (const c of Array.from(map.values())) {
    c.score = computeScore(c);
  }

  const candidate_count = map.size;
  const pump_style_count = Array.from(map.values()).filter((c) =>
    isPumpStyleMintOrSymbol(c.mint, c.symbol)
  ).length;
  const hardSpamOnly = Array.from(map.values()).filter(
    (c) => isHardSpamMintOrSymbol(c.mint, c.symbol) || c.score <= SCORE_SPAM_BLOCK / 2
  ).length;

  const sorted = Array.from(map.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.fetchedAt !== a.fetchedAt) return b.fetchedAt > a.fetchedAt ? 1 : -1;
    return (b.volumeH24 ?? 0) - (a.volumeH24 ?? 0);
  });

  const { picked: dynamicPicked, stats } = selectWithCaps(sorted, true);
  const dynamicMints = new Set(dynamicPicked.map((p) => p.mint));
  const fallbackPicked: Candidate[] = [];

  const needFallback = dynamicPicked.length < MIN_DYNAMIC_BEFORE_ALLOWLIST;
  if (needFallback) {
    for (const allow of KNOWN_TOKEN_ALLOWLIST) {
      const total = dynamicPicked.length + fallbackPicked.length;
      if (total >= MAX_DYNAMIC_HOT_TOKENS) break;
      if (dynamicMints.has(allow.mint) || fallbackPicked.some((f) => f.mint === allow.mint)) {
        continue;
      }
      if (!isValidMint(allow.mint)) continue;

      fallbackPicked.push({
        mint: allow.mint,
        symbol: allow.symbol,
        canonicalUrl: null,
        labels: new Set<PulseTokenLabel>(["Known token"]),
        liquidityUsd: null,
        volumeH24: null,
        signal: null,
        topicIds: new Set(),
        fetchedAt: new Date().toISOString(),
        hasNewPair: false,
        hasBoost: false,
        inNewTokens: false,
        inTopHeat: false,
        isKnownFallback: true,
        score: 0,
      });
    }
  }

  const ordered = [...dynamicPicked, ...fallbackPicked].slice(0, MAX_DYNAMIC_HOT_TOKENS);
  const dynamicCount = dynamicPicked.length;
  const fallbackCount = fallbackPicked.length;

  const filterParts: string[] = [];
  if (pump_style_count > 0) {
    filterParts.push(
      `${pump_style_count} pump-style (penalty cap max ${MAX_PUMP_STYLE_SLOTS_DEFAULT}, up to ${MAX_PUMP_STYLE_SLOTS_ELEVATED} with liq≥${PUMP_STYLE_ELEVATED_LIQ_USD} or vol≥${PUMP_STYLE_MEANINGFUL_VOLUME_H24})`
    );
  }
  if (hardSpamOnly > 0) filterParts.push(`${hardSpamOnly} hard-spam blocked`);
  if (stats.excluded_pump_cap_count > 0) {
    filterParts.push(`${stats.excluded_pump_cap_count} skipped (pump-style slot cap)`);
  }
  if (stats.excluded_boost_cap_count > 0) {
    filterParts.push(`${stats.excluded_boost_cap_count} skipped (boost slot cap)`);
  }
  if (stats.excluded_low_liq_count > 0) {
    filterParts.push(`${stats.excluded_low_liq_count} skipped (low-liq slot cap)`);
  }
  if (dynamicCount === 0 && candidate_count > 0) {
    filterParts.push("no eligible dynamic after caps; using allowlist fallback");
  }

  const debug: ScannerSelectionDebug = {
    candidate_count,
    selected_dynamic_count: dynamicCount,
    fallback_count: fallbackCount,
    pump_style_count,
    selected_pump_style_count: stats.selected_pump_style_count,
    excluded_spam_count: stats.excluded_spam_count,
    excluded_low_liq_count: stats.excluded_low_liq_count,
    excluded_boost_cap_count: stats.excluded_boost_cap_count,
    excluded_pump_cap_count: stats.excluded_pump_cap_count,
    selected_symbols: dynamicPicked.map((p) => p.symbol).join(","),
    fallback_symbols: fallbackPicked.map((p) => p.symbol).join(","),
    ranking_date_used: date,
    filter_note: filterParts.join("; ") || "ok",
  };

  const anchor: PulseTokenRow = {
    symbol: SOL_SYMBOL,
    mint: SOL_MINT,
    priceUsd: null,
    change24hPct: null,
    labels: ["Ecosystem anchor"],
    canonicalUrl: null,
  };

  return {
    anchor,
    hotTokens: ordered.map(candidateToRow),
    dynamicCount,
    fallbackCount,
    debug,
  };
}

export function mintsForPricing(anchor: PulseTokenRow, hotTokens: PulseTokenRow[]): string[] {
  const mints = [anchor.mint, ...hotTokens.map((t) => t.mint)];
  return Array.from(new Set(mints));
}
