import type { SupabaseClient } from "@supabase/supabase-js";
import { applyPricesToSnapshot } from "@/lib/market-pulse/apply-prices";
import { buildHotTapeFromRawItems } from "@/lib/market-pulse/hot-tape";
import { fetchJupiterPrices } from "@/lib/market-pulse/jupiter-price";
import {
  buildScannerHotTokens,
  mintsForPricing,
} from "@/lib/market-pulse/scanner-hot-tokens";
import {
  readHotTapeSnapshot,
  readWatchlistSnapshot,
  upsertHotTapeSnapshot,
  upsertWatchlistSnapshot,
} from "@/lib/market-pulse/snapshots";
import type { PulseRefreshResult, WatchlistSnapshotV2 } from "@/lib/market-pulse/types";

export async function runMarketPulseRefresh(
  db: SupabaseClient
): Promise<PulseRefreshResult> {
  const sourceMix: Record<string, string> = { pulse_version: "v2" };

  const scanner = await buildScannerHotTokens(db);
  const d = scanner.debug;
  sourceMix.dynamic_tokens = String(scanner.dynamicCount);
  sourceMix.fallback_tokens = String(scanner.fallbackCount);
  sourceMix.candidate_count = String(d.candidate_count);
  sourceMix.selected_dynamic_count = String(d.selected_dynamic_count);
  sourceMix.fallback_count = String(d.fallback_count);
  sourceMix.excluded_spam_count = String(d.excluded_spam_count);
  sourceMix.excluded_low_liq_count = String(d.excluded_low_liq_count);
  sourceMix.excluded_boost_cap_count = String(d.excluded_boost_cap_count);
  sourceMix.pump_style_count = String(d.pump_style_count);
  sourceMix.selected_pump_style_count = String(d.selected_pump_style_count);
  sourceMix.excluded_pump_cap_count = String(d.excluded_pump_cap_count);
  sourceMix.selected_symbols = d.selected_symbols;
  sourceMix.fallback_symbols = d.fallback_symbols;
  sourceMix.ranking_date_used = d.ranking_date_used;
  sourceMix.filter_note = d.filter_note;

  let snapshot: WatchlistSnapshotV2 = {
    anchor: scanner.anchor,
    hotTokens: scanner.hotTokens,
  };

  const mintIds = mintsForPricing(snapshot.anchor, snapshot.hotTokens);
  const jupiter = await fetchJupiterPrices(mintIds);
  sourceMix.jupiter = jupiter.ok ? "ok" : "error";

  if (jupiter.ok) {
    snapshot = applyPricesToSnapshot(snapshot.anchor, snapshot.hotTokens, jupiter.byMint);
  } else {
    const prior = await readWatchlistSnapshot(db);
    if (prior?.payload_json) {
      const p = prior.payload_json;
      snapshot = {
        anchor: {
          ...scanner.anchor,
          priceUsd: p.anchor.priceUsd,
          change24hPct: p.anchor.change24hPct,
        },
        hotTokens: scanner.hotTokens.map((t) => {
          const old = p.hotTokens.find((h) => h.mint === t.mint);
          return old
            ? {
                ...t,
                priceUsd: old.priceUsd,
                change24hPct: old.change24hPct,
              }
            : t;
        }),
      };
      sourceMix.jupiter = "error_kept_prior";
    }
  }

  await upsertWatchlistSnapshot(db, snapshot, sourceMix);

  const excludeMints = new Set([
    snapshot.anchor.mint,
    ...snapshot.hotTokens.map((t) => t.mint),
  ]);
  let hotTape = await buildHotTapeFromRawItems(db, { excludeMints });
  sourceMix.hot_tape = "ok";

  try {
    await upsertHotTapeSnapshot(db, hotTape, sourceMix);
  } catch (e) {
    sourceMix.hot_tape = "error";
    throw e;
  }

  const hasPrice =
    snapshot.anchor.priceUsd != null ||
    snapshot.hotTokens.some((t) => t.priceUsd != null);

  return {
    ok: jupiter.ok || hasPrice || hotTape.length > 0,
    watchlistCount: 1 + snapshot.hotTokens.length,
    hotTapeCount: hotTape.length,
    dynamicTokenCount: scanner.dynamicCount,
    fallbackTokenCount: scanner.fallbackCount,
    jupiterOk: jupiter.ok,
    sourceMix,
    error: jupiter.ok ? undefined : jupiter.error,
  };
}
