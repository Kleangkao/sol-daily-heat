import type { SupabaseClient } from "@supabase/supabase-js";
import type { HotTapeItem, MarketPulseSlot, WatchlistSnapshotV2 } from "@/lib/market-pulse/types";
import {
  normalizeHotTapePayload,
  normalizeWatchlistSnapshot,
} from "@/lib/market-pulse/normalize-payload";

export type SnapshotRow =
  | {
      slot: "watchlist";
      payload_json: WatchlistSnapshotV2;
      source_mix: Record<string, string>;
      fetched_at: string;
    }
  | {
      slot: "hot_tape";
      payload_json: HotTapeItem[];
      source_mix: Record<string, string>;
      fetched_at: string;
    };

export type SnapshotReadError = {
  code: string;
  message: string;
  slot: MarketPulseSlot;
};

export async function readWatchlistSnapshot(
  db: SupabaseClient
): Promise<SnapshotRow & { slot: "watchlist" } | null> {
  const { data, error } = await db
    .from("market_pulse_snapshots")
    .select("slot, payload_json, source_mix, fetched_at")
    .eq("slot", "watchlist")
    .maybeSingle();

  if (error) {
    const wrapped = new Error(error.message) as Error & { supabase?: SnapshotReadError };
    wrapped.supabase = { code: error.code ?? "unknown", message: error.message, slot: "watchlist" };
    throw wrapped;
  }
  if (!data) return null;

  return {
    slot: "watchlist",
    payload_json: normalizeWatchlistSnapshot(data.payload_json),
    source_mix: (data.source_mix ?? {}) as Record<string, string>,
    fetched_at: data.fetched_at as string,
  };
}

export async function readHotTapeSnapshot(
  db: SupabaseClient
): Promise<SnapshotRow & { slot: "hot_tape" } | null> {
  const { data, error } = await db
    .from("market_pulse_snapshots")
    .select("slot, payload_json, source_mix, fetched_at")
    .eq("slot", "hot_tape")
    .maybeSingle();

  if (error) {
    const wrapped = new Error(error.message) as Error & { supabase?: SnapshotReadError };
    wrapped.supabase = { code: error.code ?? "unknown", message: error.message, slot: "hot_tape" };
    throw wrapped;
  }
  if (!data) return null;

  return {
    slot: "hot_tape",
    payload_json: normalizeHotTapePayload(data.payload_json),
    source_mix: (data.source_mix ?? {}) as Record<string, string>,
    fetched_at: data.fetched_at as string,
  };
}

export async function upsertWatchlistSnapshot(
  db: SupabaseClient,
  payload: WatchlistSnapshotV2,
  sourceMix: Record<string, string>
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db.from("market_pulse_snapshots").upsert(
    {
      slot: "watchlist",
      payload_json: payload,
      source_mix: sourceMix,
      fetched_at: now,
      updated_at: now,
    },
    { onConflict: "slot" }
  );
  if (error) throw error;
}

export async function upsertHotTapeSnapshot(
  db: SupabaseClient,
  payload: HotTapeItem[],
  sourceMix: Record<string, string>
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db.from("market_pulse_snapshots").upsert(
    {
      slot: "hot_tape",
      payload_json: payload,
      source_mix: sourceMix,
      fetched_at: now,
      updated_at: now,
    },
    { onConflict: "slot" }
  );
  if (error) throw error;
}
