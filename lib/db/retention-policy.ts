/**
 * Supabase retention windows (tune for Free-tier storage).
 * ranking_date is a snapshot key; freshness uses rolling windows in the pipeline.
 */

/** Delete raw_items when fetched_at is older than this. */
export const RAW_ITEMS_RETENTION_DAYS = 7;

/** Delete ingest_runs when started_at is older than this. */
export const INGEST_RUNS_RETENTION_DAYS = 14;

/** Archive then delete topics when last_updated_at is older than this (if unprotected). */
export const TOPICS_RETENTION_DAYS = 90;

/** Delete daily_rankings when ranking_date is older than this (today is never deleted). */
export const DAILY_RANKINGS_RETENTION_DAYS = 180;

/** Detached topic_sources (raw_item_id null) older than this may be removed. */
export const ORPHAN_TOPIC_SOURCES_DAYS = 90;

export const DELETE_BATCH_SIZE = 200;
