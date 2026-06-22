import type { SupabaseClient } from "@supabase/supabase-js";
import type { RankingSection } from "@/lib/types/db";
import { DASHBOARD_SECTIONS } from "./dashboard-sections";
import { SECTION_LIMITS } from "@/lib/process/section-limits";
import { readStoredStoryAt } from "@/lib/heat/story-timestamp";
import { computeAdjustedRankScore } from "@/lib/scoring/freshness-boost";

type RowForSort = {
  id: string;
  heat_score: number;
  confidence_score: number;
  topics:
    | { last_updated_at: string; metadata_json?: Record<string, unknown> | null }
    | { last_updated_at: string; metadata_json?: Record<string, unknown> | null }[];
};

function storyAt(row: RowForSort): string {
  const t = row.topics;
  const topic = Array.isArray(t) ? t[0] : t;
  if (!topic) return "";
  const stored = readStoredStoryAt(topic.metadata_json ?? {});
  return stored ?? topic.last_updated_at ?? "";
}

/**
 * Assign rank_position 1..n per section for a given day.
 * Sort: adjusted score (heat + freshness boost) → story_at desc → heat_score desc → confidence desc.
 * builder_watch keeps rank_position from curation snapshot (status → editorial → GitHub).
 */
export async function assignRankPositions(
  db: SupabaseClient,
  rankingDate: string
): Promise<void> {
  for (const { rankingSection } of DASHBOARD_SECTIONS) {
    if (rankingSection === "builder_watch") continue;
    const { data, error } = await db
      .from("daily_rankings")
      .select("id, heat_score, confidence_score, topics(last_updated_at, metadata_json)")
      .eq("ranking_date", rankingDate)
      .eq("section", rankingSection)
      .eq("status", "published");

    if (error || !data?.length) continue;

    const limit = SECTION_LIMITS[rankingSection];
    const sorted = (data as RowForSort[]).sort((a, b) => {
      const storyA = storyAt(a);
      const storyB = storyAt(b);
      const adjA = computeAdjustedRankScore(Number(a.heat_score), storyA);
      const adjB = computeAdjustedRankScore(Number(b.heat_score), storyB);
      const scoreDiff = adjB - adjA;
      if (scoreDiff !== 0) return scoreDiff;

      const storyDiff = new Date(storyB).getTime() - new Date(storyA).getTime();
      if (storyDiff !== 0) return storyDiff;

      const heatDiff = Number(b.heat_score) - Number(a.heat_score);
      if (heatDiff !== 0) return heatDiff;

      return Number(b.confidence_score) - Number(a.confidence_score);
    });

    const toRank = sorted.slice(0, limit);
    for (let i = 0; i < toRank.length; i++) {
      await db
        .from("daily_rankings")
        .update({ rank_position: i + 1 })
        .eq("id", toRank[i].id);
    }
  }
}
