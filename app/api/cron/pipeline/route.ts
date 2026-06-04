import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/env";
import { cronMissingAdminResponse, cronUnauthorizedResponse } from "@/lib/api/cron-http";
import { runIngest } from "@/lib/ingest/run-ingest";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { runPipeline } from "@/lib/process/run-pipeline";

export const dynamic = "force-dynamic";

/** Combined ingest + pipeline — recommended single cron job for MVP. */
export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return cronUnauthorizedResponse();
  }

  try {
    const ingest = await runIngest();
    if (ingest.skipped) {
      return NextResponse.json(
        {
          ok: false,
          ingest,
          process: null,
          error: ingest.reason ?? "Ingest skipped",
        },
        { status: 503 }
      );
    }

    const db = getSupabaseAdmin();
    if (!db) {
      return cronMissingAdminResponse({ ingest });
    }

    const process = await runPipeline(db);
    return NextResponse.json({ ok: true, ingest, process });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
