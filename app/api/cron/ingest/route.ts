import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/env";
import { cronUnauthorizedResponse } from "@/lib/api/cron-http";
import { runIngest } from "@/lib/ingest/run-ingest";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return cronUnauthorizedResponse();
  }

  try {
    const summary = await runIngest();
    if (summary.skipped) {
      return NextResponse.json(
        { ok: false, ingest: summary, error: summary.reason },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, ingest: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
