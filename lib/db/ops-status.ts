import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCronSecret,
  hasSupabaseAdmin,
  hasSupabaseBrowser,
} from "@/lib/env";
import { fetchHeatDashboard } from "@/lib/db/queries/heat-today";
import { mergeDashboard } from "@/lib/db/merge-dashboard";
import { getDemoDashboard } from "@/lib/mock/demo-data";
import type { DashboardDataSource } from "@/lib/types/heat";

export type OpsStatus = {
  ok: boolean;
  app: string;
  timestamp: string;
  env: {
    nodeEnv: string;
    supabasePublicConfigured: boolean;
    supabaseServiceRoleConfigured: boolean;
    cronSecretConfigured: boolean;
  };
  rankings: {
    today: string;
    latestRankingDate: string | null;
    publishedCountToday: number;
  };
  dashboard: {
    dataSource: DashboardDataSource | "unknown";
    sectionCounts: Record<string, number> | null;
  };
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getOpsStatus(
  browserDb: SupabaseClient | null
): Promise<OpsStatus> {
  const today = todayDate();
  let latestRankingDate: string | null = null;
  let publishedCountToday = 0;
  let dataSource: DashboardDataSource | "unknown" = "unknown";
  let sectionCounts: Record<string, number> | null = null;

  if (browserDb) {
    const { count, error: countErr } = await browserDb
      .from("daily_rankings")
      .select("*", { count: "exact", head: true })
      .eq("ranking_date", today)
      .eq("status", "published");
    if (!countErr) publishedCountToday = count ?? 0;

    const { data: latestRows, error: latestErr } = await browserDb
      .from("daily_rankings")
      .select("ranking_date")
      .eq("status", "published")
      .order("ranking_date", { ascending: false })
      .limit(1);
    if (!latestErr && latestRows?.[0]) {
      latestRankingDate = latestRows[0].ranking_date as string;
    }

    const live = await fetchHeatDashboard(browserDb, today);
    const merged = mergeDashboard(live, getDemoDashboard(today));
    dataSource = merged.dataSource ?? "unknown";
    sectionCounts = {
      topHeat: merged.topHeat.length,
      newTokens: merged.newTokens.length,
      defiSignals: merged.defiSignals.length,
      builderWatch: merged.builderWatch.length,
      creatorAngles: merged.creatorAngles.length,
      investorWatchlist: merged.investorWatchlist.length,
    };
  } else if (!hasSupabaseBrowser()) {
    dataSource = "mock";
  }

  return {
    ok: true,
    app: "sol-daily-heat",
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV ?? "development",
      supabasePublicConfigured: hasSupabaseBrowser(),
      supabaseServiceRoleConfigured: hasSupabaseAdmin(),
      cronSecretConfigured: Boolean(getCronSecret()),
    },
    rankings: {
      today,
      latestRankingDate,
      publishedCountToday,
    },
    dashboard: {
      dataSource,
      sectionCounts,
    },
  };
}
