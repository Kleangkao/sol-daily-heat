import { NextResponse } from "next/server";
import { fetchMarketPulse } from "@/lib/market-pulse/fetch-pulse";
import { getSupabaseForPulseRead } from "@/lib/market-pulse/pulse-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { db, client } = getSupabaseForPulseRead();
  const devMode = process.env.NODE_ENV === "development";

  try {
    const pulse = await fetchMarketPulse(db, {
      readClient: client,
      devMode,
    });
    return NextResponse.json(pulse, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Market pulse unavailable";
    return NextResponse.json(
      {
        watchlist: [],
        hotTape: [],
        fetchedAt: null,
        stale: true,
        dataSource: "empty" as const,
        sourceMix: {
          read_client: client,
          error: message,
          ...(devMode ? { _readErrors: message } : {}),
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
