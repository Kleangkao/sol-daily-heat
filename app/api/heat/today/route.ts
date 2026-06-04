import { NextRequest, NextResponse } from "next/server";
import { getSupabaseBrowser } from "@/lib/db/supabase-browser";
import { fetchHeatDashboard } from "@/lib/db/queries/heat-today";
import { mergeDashboard } from "@/lib/db/merge-dashboard";
import { getDemoDashboard } from "@/lib/mock/demo-data";

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

    const live = await fetchHeatDashboard(db, date ?? undefined);
    const merged = mergeDashboard(live, mock);
    return NextResponse.json(merged);
  } catch {
    return NextResponse.json({
      ...mock,
      dataSource: "mock" as const,
    });
  }
}
