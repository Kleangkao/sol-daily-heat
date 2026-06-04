import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DAILY_RANKINGS_RETENTION_DAYS,
  DELETE_BATCH_SIZE,
  INGEST_RUNS_RETENTION_DAYS,
  ORPHAN_TOPIC_SOURCES_DAYS,
  RAW_ITEMS_RETENTION_DAYS,
  TOPICS_RETENTION_DAYS,
} from "./retention-policy";

export type CleanupCounts = {
  daily_rankings: number;
  ingest_runs: number;
  raw_items: number;
  topic_sources_orphan: number;
  topics_archived: number;
  topics_deleted: number;
  tokens_orphan: number;
  protocols_orphan: number;
};

export type CleanupResult = {
  dryRun: boolean;
  today: string;
  cutoffs: {
    raw_items_fetched_before: string;
    ingest_runs_started_before: string;
    topics_updated_before: string;
    daily_rankings_before: string;
    orphan_topic_sources_before: string;
  };
  protected_topic_count: number;
  wouldDelete: CleanupCounts;
  deleted: CleanupCounts;
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function cutoffTimestamp(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function cutoffDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function emptyCounts(): CleanupCounts {
  return {
    daily_rankings: 0,
    ingest_runs: 0,
    raw_items: 0,
    topic_sources_orphan: 0,
    topics_archived: 0,
    topics_deleted: 0,
    tokens_orphan: 0,
    protocols_orphan: 0,
  };
}

async function deleteRawItemsBatched(
  db: SupabaseClient,
  fetchedBefore: string
): Promise<number> {
  let total = 0;
  for (;;) {
    const { data, error } = await db
      .from("raw_items")
      .select("id")
      .lt("fetched_at", fetchedBefore)
      .limit(DELETE_BATCH_SIZE);
    if (error) throw error;
    if (!data?.length) break;
    const ids = data.map((r) => r.id);
    const { error: delErr } = await db.from("raw_items").delete().in("id", ids);
    if (delErr) throw delErr;
    total += ids.length;
    if (ids.length < DELETE_BATCH_SIZE) break;
  }
  return total;
}

async function deleteRankingsBatched(
  db: SupabaseClient,
  rankingBefore: string,
  today: string
): Promise<number> {
  let total = 0;
  for (;;) {
    const { data, error } = await db
      .from("daily_rankings")
      .select("id")
      .lt("ranking_date", rankingBefore)
      .neq("ranking_date", today)
      .limit(DELETE_BATCH_SIZE);
    if (error) throw error;
    if (!data?.length) break;
    const ids = data.map((r) => r.id);
    const { error: delErr } = await db.from("daily_rankings").delete().in("id", ids);
    if (delErr) throw delErr;
    total += ids.length;
    if (ids.length < DELETE_BATCH_SIZE) break;
  }
  return total;
}

async function deleteIngestRunsBatched(
  db: SupabaseClient,
  startedBefore: string
): Promise<number> {
  let total = 0;
  for (;;) {
    const { data, error } = await db
      .from("ingest_runs")
      .select("id")
      .lt("started_at", startedBefore)
      .limit(DELETE_BATCH_SIZE);
    if (error) throw error;
    if (!data?.length) break;
    const ids = data.map((r) => r.id);
    const { error: delErr } = await db.from("ingest_runs").delete().in("id", ids);
    if (delErr) throw delErr;
    total += ids.length;
    if (ids.length < DELETE_BATCH_SIZE) break;
  }
  return total;
}

async function deleteOrphanTopicSourcesBatched(
  db: SupabaseClient,
  createdBefore: string
): Promise<number> {
  let total = 0;
  for (;;) {
    const { data, error } = await db
      .from("topic_sources")
      .select("id")
      .is("raw_item_id", null)
      .lt("created_at", createdBefore)
      .limit(DELETE_BATCH_SIZE);
    if (error) throw error;
    if (!data?.length) break;
    const ids = data.map((r) => r.id);
    const { error: delErr } = await db.from("topic_sources").delete().in("id", ids);
    if (delErr) throw delErr;
    total += ids.length;
    if (ids.length < DELETE_BATCH_SIZE) break;
  }
  return total;
}

async function fetchProtectedTopicIds(
  db: SupabaseClient,
  rankingsBefore: string,
  today: string
): Promise<Set<string>> {
  const protectedIds = new Set<string>();

  const { data: recentRankings, error: rErr } = await db
    .from("daily_rankings")
    .select("topic_id")
    .gte("ranking_date", rankingsBefore);
  if (rErr) throw rErr;
  for (const row of recentRankings ?? []) {
    protectedIds.add(row.topic_id as string);
  }

  const { data: todayRankings, error: tErr } = await db
    .from("daily_rankings")
    .select("topic_id")
    .eq("ranking_date", today);
  if (tErr) throw tErr;
  for (const row of todayRankings ?? []) {
    protectedIds.add(row.topic_id as string);
  }

  return protectedIds;
}

async function countTopicsToArchive(
  db: SupabaseClient,
  topicsUpdatedBefore: string,
  protectedIds: Set<string>
): Promise<number> {
  const { data: oldTopics, error } = await db
    .from("topics")
    .select("id")
    .eq("status", "active")
    .lt("last_updated_at", topicsUpdatedBefore);
  if (error) throw error;
  return (oldTopics ?? []).filter((t) => !protectedIds.has(t.id as string)).length;
}

async function archiveTopics(
  db: SupabaseClient,
  topicsUpdatedBefore: string,
  protectedIds: Set<string>
): Promise<number> {
  const { data: oldTopics, error } = await db
    .from("topics")
    .select("id")
    .eq("status", "active")
    .lt("last_updated_at", topicsUpdatedBefore);
  if (error) throw error;

  const ids = (oldTopics ?? [])
    .map((t) => t.id as string)
    .filter((id) => !protectedIds.has(id));

  for (let i = 0; i < ids.length; i += DELETE_BATCH_SIZE) {
    const batch = ids.slice(i, i + DELETE_BATCH_SIZE);
    const { error: updErr } = await db
      .from("topics")
      .update({ status: "archived" })
      .in("id", batch);
    if (updErr) throw updErr;
  }
  return ids.length;
}

async function topicIdsToDelete(
  db: SupabaseClient,
  topicsUpdatedBefore: string,
  protectedIds: Set<string>
): Promise<string[]> {
  const { data: archivedTopics, error } = await db
    .from("topics")
    .select("id")
    .eq("status", "archived")
    .lt("last_updated_at", topicsUpdatedBefore);
  if (error) throw error;
  return (archivedTopics ?? [])
    .map((t) => t.id as string)
    .filter((id) => !protectedIds.has(id));
}

async function countOrphanTokens(db: SupabaseClient): Promise<number> {
  const { data: tokens, error } = await db.from("tokens").select("id");
  if (error) throw error;
  let n = 0;
  for (const row of tokens ?? []) {
    const { count } = await db
      .from("topic_tokens")
      .select("*", { count: "exact", head: true })
      .eq("token_id", row.id);
    if ((count ?? 0) === 0) n += 1;
  }
  return n;
}

async function countOrphanProtocols(db: SupabaseClient): Promise<number> {
  const { data: protocols, error } = await db.from("protocols").select("id");
  if (error) throw error;
  let n = 0;
  for (const row of protocols ?? []) {
    const { count } = await db
      .from("topic_protocols")
      .select("*", { count: "exact", head: true })
      .eq("protocol_id", row.id);
    if ((count ?? 0) === 0) n += 1;
  }
  return n;
}

async function deleteOrphanTokens(db: SupabaseClient): Promise<number> {
  const { data: tokens, error } = await db.from("tokens").select("id");
  if (error) throw error;

  const orphanIds: string[] = [];
  for (const row of tokens ?? []) {
    const { count } = await db
      .from("topic_tokens")
      .select("*", { count: "exact", head: true })
      .eq("token_id", row.id);
    if ((count ?? 0) === 0) orphanIds.push(row.id as string);
  }

  for (let i = 0; i < orphanIds.length; i += DELETE_BATCH_SIZE) {
    const batch = orphanIds.slice(i, i + DELETE_BATCH_SIZE);
    const { error: delErr } = await db.from("tokens").delete().in("id", batch);
    if (delErr) throw delErr;
  }
  return orphanIds.length;
}

async function deleteOrphanProtocols(db: SupabaseClient): Promise<number> {
  const { data: protocols, error } = await db.from("protocols").select("id");
  if (error) throw error;

  const orphanIds: string[] = [];
  for (const row of protocols ?? []) {
    const { count } = await db
      .from("topic_protocols")
      .select("*", { count: "exact", head: true })
      .eq("protocol_id", row.id);
    if ((count ?? 0) === 0) orphanIds.push(row.id as string);
  }

  for (let i = 0; i < orphanIds.length; i += DELETE_BATCH_SIZE) {
    const batch = orphanIds.slice(i, i + DELETE_BATCH_SIZE);
    const { error: delErr } = await db.from("protocols").delete().in("id", batch);
    if (delErr) throw delErr;
  }
  return orphanIds.length;
}

/**
 * Retention cleanup — safe delete order:
 * 1) Archive eligible topics (status only)
 * 2) daily_rankings (ranking_date < today − 180d; today never deleted)
 * 3) ingest_runs (14d)
 * 4) raw_items (7d fetched_at) — topic_sources.raw_item_id SET NULL via FK
 * 5) orphan topic_sources (null raw_item_id, 90d+)
 * 6) topics (archived, 90d+, not in ranking-protected set)
 * 7) orphan tokens / protocols
 */
export async function runCleanup(
  db: SupabaseClient,
  options: { dryRun?: boolean } = {}
): Promise<CleanupResult> {
  const dryRun = options.dryRun ?? false;
  const today = todayDate();

  const cutoffs = {
    raw_items_fetched_before: cutoffTimestamp(RAW_ITEMS_RETENTION_DAYS),
    ingest_runs_started_before: cutoffTimestamp(INGEST_RUNS_RETENTION_DAYS),
    topics_updated_before: cutoffTimestamp(TOPICS_RETENTION_DAYS),
    daily_rankings_before: cutoffDate(DAILY_RANKINGS_RETENTION_DAYS),
    orphan_topic_sources_before: cutoffTimestamp(ORPHAN_TOPIC_SOURCES_DAYS),
  };

  const protectedIds = await fetchProtectedTopicIds(
    db,
    cutoffs.daily_rankings_before,
    today
  );

  const wouldDelete = emptyCounts();
  wouldDelete.topics_archived = await countTopicsToArchive(
    db,
    cutoffs.topics_updated_before,
    protectedIds
  );

  const { count: rankingsCount, error: rcErr } = await db
    .from("daily_rankings")
    .select("*", { count: "exact", head: true })
    .lt("ranking_date", cutoffs.daily_rankings_before)
    .neq("ranking_date", today);
  if (rcErr) throw rcErr;
  wouldDelete.daily_rankings = rankingsCount ?? 0;

  const { count: ingestCount, error: icErr } = await db
    .from("ingest_runs")
    .select("*", { count: "exact", head: true })
    .lt("started_at", cutoffs.ingest_runs_started_before);
  if (icErr) throw icErr;
  wouldDelete.ingest_runs = ingestCount ?? 0;

  const { count: rawCount, error: rawErr } = await db
    .from("raw_items")
    .select("*", { count: "exact", head: true })
    .lt("fetched_at", cutoffs.raw_items_fetched_before);
  if (rawErr) throw rawErr;
  wouldDelete.raw_items = rawCount ?? 0;

  const { count: orphanTsCount, error: otsErr } = await db
    .from("topic_sources")
    .select("*", { count: "exact", head: true })
    .is("raw_item_id", null)
    .lt("created_at", cutoffs.orphan_topic_sources_before);
  if (otsErr) throw otsErr;
  wouldDelete.topic_sources_orphan = orphanTsCount ?? 0;
  wouldDelete.topics_deleted = (
    await topicIdsToDelete(db, cutoffs.topics_updated_before, protectedIds)
  ).length;
  wouldDelete.tokens_orphan = await countOrphanTokens(db);
  wouldDelete.protocols_orphan = await countOrphanProtocols(db);

  const deleted = emptyCounts();
  if (dryRun) {
    return {
      dryRun: true,
      today,
      cutoffs,
      protected_topic_count: protectedIds.size,
      wouldDelete,
      deleted,
    };
  }

  deleted.topics_archived = await archiveTopics(
    db,
    cutoffs.topics_updated_before,
    protectedIds
  );
  deleted.daily_rankings = await deleteRankingsBatched(
    db,
    cutoffs.daily_rankings_before,
    today
  );
  deleted.ingest_runs = await deleteIngestRunsBatched(
    db,
    cutoffs.ingest_runs_started_before
  );
  deleted.raw_items = await deleteRawItemsBatched(db, cutoffs.raw_items_fetched_before);
  deleted.topic_sources_orphan = await deleteOrphanTopicSourcesBatched(
    db,
    cutoffs.orphan_topic_sources_before
  );

  const topicDeleteIds = await topicIdsToDelete(
    db,
    cutoffs.topics_updated_before,
    protectedIds
  );
  for (let i = 0; i < topicDeleteIds.length; i += DELETE_BATCH_SIZE) {
    const batch = topicDeleteIds.slice(i, i + DELETE_BATCH_SIZE);
    const { error } = await db.from("topics").delete().in("id", batch);
    if (error) throw error;
  }
  deleted.topics_deleted = topicDeleteIds.length;

  deleted.tokens_orphan = await deleteOrphanTokens(db);
  deleted.protocols_orphan = await deleteOrphanProtocols(db);

  return {
    dryRun: false,
    today,
    cutoffs,
    protected_topic_count: protectedIds.size,
    wouldDelete,
    deleted,
  };
}
