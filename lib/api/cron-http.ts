import { NextResponse } from "next/server";

export function cronUnauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: "Unauthorized",
      hint: "Send Authorization: Bearer <CRON_SECRET> (required in production)",
    },
    { status: 401 }
  );
}

export function cronMissingAdminResponse(extra?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      error: "Missing Supabase admin credentials",
      hint: "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server (never NEXT_PUBLIC_ for service role)",
      ...extra,
    },
    { status: 503 }
  );
}
