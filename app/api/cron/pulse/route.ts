import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/env";
import { cronUnauthorizedResponse } from "@/lib/api/cron-http";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { runMarketPulseRefresh } from "@/lib/market-pulse/run-pulse";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return cronUnauthorizedResponse();
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "Supabase admin not configured" },
      { status: 503 }
    );
  }

  try {
    const result = await runMarketPulseRefresh(db);
    return NextResponse.json({ ok: result.ok, pulse: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pulse refresh failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
