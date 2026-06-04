import type { RankingSection } from "@/lib/types/db";

/**
 * Per-section card caps for the daily snapshot dashboard.
 * Tune here when the board feels too sparse or too busy.
 */
export const SECTION_LIMITS: Record<RankingSection, number> = {
  top_heat: 10,
  new_tokens: 8,
  defi_signals: 8,
  creator_angles: 5,
  investor_watchlist: 8,
  builder_watch: 6,
};

/** Rolling window: raw items older than this are ignored by the pipeline. */
export const RANKING_RAW_LOOKBACK_HOURS = 168; // 7 days

/** Signals within this window count as "fresh" for carryover/stale logic. */
export const FRESH_SIGNAL_HOURS = 48;

/** Max rows from the same ingest adapter slug per section (avoids boost firehose). */
export const MAX_PER_ADAPTER_PER_SECTION = 3;

/** Max rows sharing the same diversity bucket (adapter + signal family) per section. */
export const MAX_PER_DIVERSITY_BUCKET_PER_SECTION = 2;
