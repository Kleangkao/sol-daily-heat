import type {
  HotTapeItem,
  PulseTokenLabel,
  PulseTokenRow,
  WatchlistSnapshotV2,
} from "@/lib/market-pulse/types";

const PULSE_LABELS: PulseTokenLabel[] = [
  "Ecosystem anchor",
  "Promoted boost",
  "New pair",
  "Low liquidity",
  "Mentioned in Top Heat",
  "In New Tokens Today",
  "Known token",
  "Pump.fun style",
  "High risk",
  "Market signal only",
];

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

function normalizeLabels(raw: unknown): PulseTokenLabel[] {
  if (typeof raw === "string" && PULSE_LABELS.includes(raw as PulseTokenLabel)) {
    return [raw as PulseTokenLabel];
  }
  if (!Array.isArray(raw)) return [];
  return raw.filter((l): l is PulseTokenLabel =>
    typeof l === "string" && PULSE_LABELS.includes(l as PulseTokenLabel)
  );
}

function normalizeTokenRow(raw: Record<string, unknown>): PulseTokenRow {
  return {
    symbol: String(raw.symbol ?? "?"),
    mint: String(raw.mint ?? ""),
    priceUsd: num(raw.priceUsd ?? raw.usdPrice),
    change24hPct: num(raw.change24hPct ?? raw.priceChange24h),
    liquidityUsd: num(raw.liquidityUsd ?? raw.liquidity),
    labels: normalizeLabels(raw.labels),
    canonicalUrl:
      typeof raw.canonicalUrl === "string"
        ? raw.canonicalUrl
        : typeof raw.canonical_url === "string"
          ? raw.canonical_url
          : null,
  };
}

function asRecordArray(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  }
  return [];
}

/** V1 array snapshot → V2 shape (no SOL split; first row not assumed SOL). */
function legacyArrayToV2(rows: PulseTokenRow[]): WatchlistSnapshotV2 {
  const sol = rows.find((r) => r.mint === "So11111111111111111111111111111111111111112");
  const anchor: PulseTokenRow = sol ?? {
    symbol: "SOL",
    mint: "So11111111111111111111111111111111111111112",
    priceUsd: null,
    change24hPct: null,
    labels: ["Ecosystem anchor"],
  };
  if (!anchor.labels.includes("Ecosystem anchor")) {
    anchor.labels = ["Ecosystem anchor", ...anchor.labels];
  }
  const hotTokens = rows.filter((r) => r.mint !== anchor.mint);
  return { anchor, hotTokens };
}

export function normalizeWatchlistSnapshot(raw: unknown): WatchlistSnapshotV2 {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (obj.anchor && typeof obj.anchor === "object") {
      const anchor = normalizeTokenRow(obj.anchor as Record<string, unknown>);
      if (!anchor.labels.includes("Ecosystem anchor")) {
        anchor.labels = ["Ecosystem anchor", ...anchor.labels];
      }
      const hotTokens = asRecordArray(obj.hotTokens).map(normalizeTokenRow);
      return { anchor, hotTokens };
    }
  }

  const legacy = asRecordArray(raw).map((row) => normalizeTokenRow(row));
  return legacyArrayToV2(legacy);
}

/** @deprecated Use normalizeWatchlistSnapshot */
export function normalizeWatchlistPayload(raw: unknown): PulseTokenRow[] {
  const v2 = normalizeWatchlistSnapshot(raw);
  return [v2.anchor, ...v2.hotTokens];
}

export function flattenWatchlistSnapshot(v2: WatchlistSnapshotV2): PulseTokenRow[] {
  return [v2.anchor, ...v2.hotTokens];
}

export function normalizeHotTapePayload(raw: unknown): HotTapeItem[] {
  return asRecordArray(raw).map((row) => ({
    symbol: String(row.symbol ?? "?"),
    mint: typeof row.mint === "string" ? row.mint : undefined,
    title: String(row.title ?? ""),
    signal: row.signal === "boost" ? "boost" : "new_pair",
    volumeH24: num(row.volumeH24 ?? row.volume_h24),
    liquidityUsd: num(row.liquidityUsd ?? row.liquidity_usd),
    canonicalUrl:
      typeof row.canonicalUrl === "string"
        ? row.canonicalUrl
        : typeof row.canonical_url === "string"
          ? row.canonical_url
          : null,
    fetchedAt: String(row.fetchedAt ?? row.fetched_at ?? new Date().toISOString()),
  }));
}
