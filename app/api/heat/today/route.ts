import { NextRequest, NextResponse } from "next/server";
import { getSupabaseBrowser } from "@/lib/db/supabase-browser";
import { fetchHeatDashboard } from "@/lib/db/queries/heat-today";
import { mergeDashboard } from "@/lib/db/merge-dashboard";
import { getDemoDashboard } from "@/lib/mock/demo-data";
import { utcTodayIso } from "@/lib/heat/snapshot-date";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? undefined;
  const mock = getDemoDashboard(date ?? undefined);

  try {
    const db = getSupabaseBrowser();
    if (!db) {
      return NextResponse.json({
        ...mock,
        dataSource: "mock" as const,
        sectionSources: {
          topHeat: "mock",
          newTokens: "mock",
          defiSignals: "mock",
          builderWatch: "mock",
          creatorAngles: "mock",
          investorWatchlist: "mock",
        },
      });
    }

    const rankingDate = date ?? utcTodayIso();
    const live = await fetchHeatDashboard(db, rankingDate);
    const merged = mergeDashboard(live, mock);
    if (merged.dataSource === "mock") {
      const { count } = await db
        .from("daily_rankings")
        .select("*", { count: "exact", head: true })
        .eq("ranking_date", rankingDate)
        .eq("status", "published");
      const { data: sample, error: sampleErr } = await db
        .from("daily_rankings")
        .select("id, section")
        .eq("ranking_date", rankingDate)
        .eq("status", "published")
        .limit(3);
      return NextResponse.json({
        ...merged,
        _opsDebug:
          count && count > 0
            ? {
                rankingDate,
                publishedCount: count,
                sampleRows: sample?.length ?? 0,
                sampleError: sampleErr?.message ?? null,
                liveRows: live ? "present" : "null",
              }
            : undefined,
      });
    }
    return NextResponse.json(merged);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Heat dashboard fetch failed";
    console.error("[api/heat/today]", message);
    return NextResponse.json({
      ...mock,
      dataSource: "mock" as const,
      fetchError: message,
    });
  }
}
