import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PULSE_EXPIRE_HOURS,
  PULSE_STALE_MINUTES,
  SOL_MINT,
} from "@/lib/market-pulse/constants";
import { flattenWatchlistSnapshot } from "@/lib/market-pulse/normalize-payload";
import { readHotTapeSnapshot, readWatchlistSnapshot } from "@/lib/market-pulse/snapshots";
import { SOL_SYMBOL } from "@/lib/market-pulse/watchlist-mints";
import type {
  MarketPulseDataSource,
  MarketPulseResponse,
  PulseTokenRow,
  WatchlistSnapshotV2,
} from "@/lib/market-pulse/types";

export type FetchMarketPulseOptions = {
  readClient?: string;
  devMode?: boolean;
};

function ageMs(iso: string): number {
  return Date.now() - new Date(iso).getTime();
}

function emptyV2(): WatchlistSnapshotV2 {
  return {
    anchor: {
      symbol: SOL_SYMBOL,
      mint: SOL_MINT,
      priceUsd: null,
      change24hPct: null,
      labels: ["Ecosystem anchor"],
    },
    hotTokens: [],
  };
}

function stripPricesIfExpired(v2: WatchlistSnapshotV2): WatchlistSnapshotV2 {
  const strip = (r: PulseTokenRow): PulseTokenRow => ({
    ...r,
    priceUsd: null,
    change24hPct: null,
  });
  return {
    anchor: strip(v2.anchor),
    hotTokens: v2.hotTokens.map(strip),
  };
}

function isMissingTableError(msg: string): boolean {
  return msg.includes("PGRST205") || msg.includes("market_pulse_snapshots");
}

export async function fetchMarketPulse(
  db: SupabaseClient | null,
  options: FetchMarketPulseOptions = {}
): Promise<MarketPulseResponse> {
  const { readClient = "unknown", devMode = false } = options;
  const sourceMix: Record<string, string> = { read_client: readClient };

  if (!db) {
    const empty = emptyV2();
    return {
      anchor: empty.anchor,
      hotTokens: [],
      watchlist: flattenWatchlistSnapshot(empty),
      hotTape: [],
      fetchedAt: null,
      stale: true,
      dataSource: "mock",
      sourceMix: { ...sourceMix, supabase: "missing" },
    };
  }

  let watchRow = null;
  let hotRow = null;
  const readErrors: string[] = [];

  try {
    watchRow = await readWatchlistSnapshot(db);
    hotRow = await readHotTapeSnapshot(db);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    readErrors.push(msg);
    if (isMissingTableError(msg)) {
      const empty = emptyV2();
      return {
        anchor: empty.anchor,
        hotTokens: [],
        watchlist: flattenWatchlistSnapshot(empty),
        hotTape: [],
        fetchedAt: null,
        stale: true,
        dataSource: "empty",
        sourceMix: {
          ...sourceMix,
          supabase: "migration_006_required",
          ...(devMode ? { _readErrors: readErrors.join("; ") } : {}),
        },
      };
    }
    if (devMode) sourceMix._readErrors = readErrors.join("; ");
  }

  Object.assign(sourceMix, watchRow?.source_mix ?? {}, hotRow?.source_mix ?? {});

  const fetchedAt =
    watchRow?.fetched_at && hotRow?.fetched_at
      ? watchRow.fetched_at > hotRow.fetched_at
        ? watchRow.fetched_at
        : hotRow.fetched_at
      : watchRow?.fetched_at ?? hotRow?.fetched_at ?? null;

  const watchAge = watchRow?.fetched_at ? ageMs(watchRow.fetched_at) : Infinity;
  const expired = watchAge > PULSE_EXPIRE_HOURS * 3600000;
  const jupiterError =
    sourceMix.jupiter === "error" || sourceMix.jupiter === "error_kept_prior";

  let v2 = watchRow?.payload_json ?? emptyV2();
  if (expired) v2 = stripPricesIfExpired(v2);

  const hotTape = hotRow?.payload_json ?? [];

  const hasWatchPrices =
    (v2.anchor.priceUsd != null || v2.hotTokens.some((t) => t.priceUsd != null)) &&
    !expired;
  const hasSnapshots = Boolean(watchRow || hotRow);
  const hasContent = hasWatchPrices || hotTape.length > 0 || v2.hotTokens.length > 0;
  const watchFresh = watchAge <= PULSE_STALE_MINUTES * 60_000;

  let dataSource: MarketPulseDataSource = "empty";
  if (hasContent) dataSource = "live";
  else if (!hasSnapshots) dataSource = "empty";
  else dataSource = "live";

  const stale =
    !hasSnapshots ||
    !hasContent ||
    expired ||
    jupiterError ||
    (!watchFresh && !hasWatchPrices);

  if (devMode) {
    sourceMix._debug = JSON.stringify({
      hasSnapshots,
      hotTokens: v2.hotTokens.length,
      hotTapeLen: hotTape.length,
      hasWatchPrices,
      watchFresh,
      watchAgeMin: Math.round(watchAge / 60_000),
    });
  }

  return {
    anchor: v2.anchor,
    hotTokens: v2.hotTokens,
    watchlist: flattenWatchlistSnapshot(v2),
    hotTape,
    fetchedAt,
    stale,
    dataSource,
    sourceMix,
  };
}
