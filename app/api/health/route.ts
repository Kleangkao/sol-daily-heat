import { NextResponse } from "next/server";
import { getSupabaseBrowser } from "@/lib/db/supabase-browser";
import { getOpsStatus } from "@/lib/db/ops-status";

export const dynamic = "force-dynamic";

/** Public ops health — no secrets, booleans only for server config. */
export async function GET() {
  try {
    const browserDb = getSupabaseBrowser();
    const status = await getOpsStatus(browserDb);
    return NextResponse.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Health check failed";
    return NextResponse.json(
      {
        ok: false,
        app: "sol-daily-heat",
        timestamp: new Date().toISOString(),
        error: message,
      },
      { status: 500 }
    );
  }
}
