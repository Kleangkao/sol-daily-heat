import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/env";
import { cronMissingAdminResponse, cronUnauthorizedResponse } from "@/lib/api/cron-http";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { runPipeline } from "@/lib/process/run-pipeline";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return cronUnauthorizedResponse();
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return cronMissingAdminResponse();
  }

  try {
    const process = await runPipeline(db);
    return NextResponse.json({ ok: true, process });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
