import type { SupabaseClient } from "@supabase/supabase-js";
import type { RankingSection } from "@/lib/types/db";
import { DASHBOARD_SECTIONS } from "./dashboard-sections";
import { SECTION_LIMITS } from "@/lib/process/section-limits";

type RowForSort = {
  id: string;
  heat_score: number;
  confidence_score: number;
  topics: { last_updated_at: string } | { last_updated_at: string }[];
};

function lastUpdatedAt(row: RowForSort): string {
  const t = row.topics;
  if (Array.isArray(t)) return t[0]?.last_updated_at ?? "";
  return t?.last_updated_at ?? "";
}

/**
 * Assign rank_position 1..n per section for a given day.
 * Sort: heat_score desc → confidence_score desc → last_updated_at desc.
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
      .select("id, heat_score, confidence_score, topics(last_updated_at)")
      .eq("ranking_date", rankingDate)
      .eq("section", rankingSection)
      .eq("status", "published");

    if (error || !data?.length) continue;

    const limit = SECTION_LIMITS[rankingSection];
    const sorted = (data as RowForSort[]).sort((a, b) => {
      const scoreDiff = Number(b.heat_score) - Number(a.heat_score);
      if (scoreDiff !== 0) return scoreDiff;

      const confDiff = Number(b.confidence_score) - Number(a.confidence_score);
      if (confDiff !== 0) return confDiff;

      return (
        new Date(lastUpdatedAt(b)).getTime() - new Date(lastUpdatedAt(a)).getTime()
      );
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
