import type { SupabaseClient } from "@supabase/supabase-js";
import type { RankingSection } from "@/lib/types/db";
import { SECTION_LIMITS } from "@/lib/process/section-limits";
import { DASHBOARD_SECTIONS } from "@/lib/db/dashboard-sections";
import type { SectionCuration } from "@/lib/process/curate-rankings";

/**
 * Mark every published row for this ranking_date as superseded before a new snapshot.
 */
export async function supersedePublishedForDate(
  db: SupabaseClient,
  rankingDate: string
): Promise<number> {
  const { data, error } = await db
    .from("daily_rankings")
    .update({ status: "superseded" })
    .eq("ranking_date", rankingDate)
    .eq("status", "published")
    .select("id");

  if (error) {
    throw new Error(`Failed to supersede published rankings for ${rankingDate}: ${error.message}`);
  }
  return data?.length ?? 0;
}

function allowedTopicIdsBySection(
  sectionCuration: SectionCuration
): Map<RankingSection, Set<string>> {
  const map = new Map<RankingSection, Set<string>>();
  for (const { rankingSection } of DASHBOARD_SECTIONS) {
    const curated = sectionCuration.get(rankingSection) ?? [];
    map.set(rankingSection, new Set(curated.map((c) => c.topicId)));
  }
  return map;
}

/**
 * Supersede published rows for ranking_date that are not in the current curated snapshot.
 */
export async function repairStrayPublishedRows(
  db: SupabaseClient,
  rankingDate: string,
  sectionCuration: SectionCuration
): Promise<number> {
  const allowed = allowedTopicIdsBySection(sectionCuration);
  let repaired = 0;

  for (const { rankingSection } of DASHBOARD_SECTIONS) {
    const allowedIds = allowed.get(rankingSection) ?? new Set<string>();
    const { data: rows, error } = await db
      .from("daily_rankings")
      .select("id, topic_id")
      .eq("ranking_date", rankingDate)
      .eq("section", rankingSection)
      .eq("status", "published");

    if (error) {
      throw new Error(
        `Failed to load published rankings for repair (${rankingSection}): ${error.message}`
      );
    }

    const strayIds = (rows ?? [])
      .filter((r) => !allowedIds.has((r as { topic_id: string }).topic_id))
      .map((r) => (r as { id: string }).id);

    if (strayIds.length === 0) continue;

    const { error: upErr } = await db
      .from("daily_rankings")
      .update({ status: "superseded" })
      .in("id", strayIds);

    if (upErr) {
      throw new Error(`Failed to supersede stray rankings (${rankingSection}): ${upErr.message}`);
    }
    repaired += strayIds.length;
  }

  return repaired;
}

/**
 * Hard cap: if a section still has more published rows than allowed, supersede excess
 * (lowest heat_score first).
 */
export async function enforcePublishedSectionCaps(
  db: SupabaseClient,
  rankingDate: string
): Promise<number> {
  let capped = 0;

  for (const { rankingSection } of DASHBOARD_SECTIONS) {
    const limit = SECTION_LIMITS[rankingSection];
    const { data: rows, error } = await db
      .from("daily_rankings")
      .select("id, heat_score, confidence_score, rank_position")
      .eq("ranking_date", rankingDate)
      .eq("section", rankingSection)
      .eq("status", "published")
      .order("heat_score", { ascending: false })
      .order("confidence_score", { ascending: false })
      .order("rank_position", { ascending: true });

    if (error || !rows || rows.length <= limit) continue;

    const excess = rows.slice(limit);
    const excessIds = excess.map((r) => (r as { id: string }).id);
    const { error: upErr } = await db
      .from("daily_rankings")
      .update({ status: "superseded" })
      .in("id", excessIds);

    if (upErr) {
      throw new Error(`Failed to cap section ${rankingSection}: ${upErr.message}`);
    }
    capped += excessIds.length;
  }

  return capped;
}

/**
 * One-shot repair for a date (e.g. accumulated duplicates from prior pipeline runs).
 */
export async function repairRankingSnapshotForDate(
  db: SupabaseClient,
  rankingDate: string,
  sectionCuration?: SectionCuration
): Promise<{ stray: number; capped: number }> {
  let stray = 0;
  if (sectionCuration) {
    stray = await repairStrayPublishedRows(db, rankingDate, sectionCuration);
  }
  const capped = await enforcePublishedSectionCaps(db, rankingDate);
  return { stray, capped };
}

export async function writeRankingSnapshot(
  db: SupabaseClient,
  rankingDate: string,
  sectionCuration: SectionCuration
): Promise<{ superseded: number; written: number; repaired: number; capped: number }> {
  const superseded = await supersedePublishedForDate(db, rankingDate);

  let written = 0;
  for (const [section, curated] of Array.from(sectionCuration.entries())) {
    for (let i = 0; i < curated.length; i++) {
      const candidate = curated[i];
      const { error } = await db.from("daily_rankings").upsert(
        {
          topic_id: candidate.topicId,
          ranking_date: rankingDate,
          heat_score: candidate.heat_score,
          section,
          rank_position: i + 1,
          score_breakdown_json: candidate.score_breakdown_json,
          confidence_score: candidate.confidence_score,
          is_carryover: candidate.is_carryover,
          status: "published",
          metadata_json: {
            signals: candidate.uniqueSignals,
            is_updated_story: candidate.is_carryover,
          },
        },
        { onConflict: "topic_id,ranking_date,section" }
      );
      if (error) {
        throw new Error(`Failed to upsert ranking (${section}): ${error.message}`);
      }
      written += 1;
    }
  }

  const stray = await repairStrayPublishedRows(db, rankingDate, sectionCuration);
  const capped = await enforcePublishedSectionCaps(db, rankingDate);

  return { superseded, written, repaired: stray, capped };
}

/**
 * Remove superseded rows for this ranking_date so diagnostics and row counts
 * reflect only the active snapshot (published rows).
 */
export async function pruneSupersededForDate(
  db: SupabaseClient,
  rankingDate: string
): Promise<number> {
  const { data, error } = await db
    .from("daily_rankings")
    .delete()
    .eq("ranking_date", rankingDate)
    .eq("status", "superseded")
    .select("id");

  if (error) {
    throw new Error(`Failed to prune superseded rankings for ${rankingDate}: ${error.message}`);
  }
  return data?.length ?? 0;
}
