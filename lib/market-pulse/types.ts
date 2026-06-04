export type MarketPulseSlot = "watchlist" | "hot_tape";

export type PulseTokenLabel =
  | "Ecosystem anchor"
  | "Promoted boost"
  | "New pair"
  | "Low liquidity"
  | "Mentioned in Top Heat"
  | "In New Tokens Today"
  | "Known token"
  | "Pump.fun style"
  | "High risk"
  | "Market signal only";

export type PulseTokenRow = {
  symbol: string;
  mint: string;
  priceUsd: number | null;
  change24hPct: number | null;
  liquidityUsd?: number | null;
  labels: PulseTokenLabel[];
  canonicalUrl?: string | null;
};

/** V2 watchlist snapshot stored in Supabase. */
export type WatchlistSnapshotV2 = {
  anchor: PulseTokenRow;
  hotTokens: PulseTokenRow[];
};

/** @deprecated V1 array snapshot — normalized to V2 on read. */
export type WatchlistItem = PulseTokenRow;

export type HotTapeSignal = "boost" | "new_pair";

export type HotTapeItem = {
  symbol: string;
  mint?: string;
  title: string;
  signal: HotTapeSignal;
  volumeH24?: number | null;
  liquidityUsd?: number | null;
  canonicalUrl?: string | null;
  fetchedAt: string;
};

export type MarketPulseDataSource = "live" | "mock" | "empty";

export type MarketPulseResponse = {
  /** SOL anchor (V2). */
  anchor: PulseTokenRow | null;
  /** Scanner-selected tokens excluding SOL (V2). */
  hotTokens: PulseTokenRow[];
  /** Flat list: anchor + hotTokens (compat). */
  watchlist: PulseTokenRow[];
  hotTape: HotTapeItem[];
  fetchedAt: string | null;
  stale: boolean;
  dataSource: MarketPulseDataSource;
  sourceMix: Record<string, string>;
};

export type PulseRefreshResult = {
  ok: boolean;
  watchlistCount: number;
  hotTapeCount: number;
  dynamicTokenCount: number;
  fallbackTokenCount: number;
  jupiterOk: boolean;
  sourceMix: Record<string, string>;
  error?: string;
};
