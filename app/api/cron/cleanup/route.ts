import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/env";
import { cronMissingAdminResponse, cronUnauthorizedResponse } from "@/lib/api/cron-http";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { runCleanup } from "@/lib/db/run-cleanup";

export const dynamic = "force-dynamic";

/** Retention cleanup — service role only, cron-protected in production. */
export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return cronUnauthorizedResponse();
  }

  const dryRun = request.nextUrl.searchParams.get("dry_run") === "1";

  try {
    const db = getSupabaseAdmin();
    if (!db) {
      return cronMissingAdminResponse({ dryRun });
    }
    const cleanup = await runCleanup(db, { dryRun });
    return NextResponse.json({ ok: true, dryRun, cleanup });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cleanup failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
