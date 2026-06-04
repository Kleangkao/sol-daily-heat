import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { getSupabaseBrowser } from "@/lib/db/supabase-browser";

/**
 * Server-side pulse reads: prefer service role (matches pulse:local writes).
 * Falls back to anon when service role is unset (local dev without admin key).
 */
export function getSupabaseForPulseRead(): {
  db: SupabaseClient | null;
  client: "admin" | "anon" | "none";
} {
  const admin = getSupabaseAdmin();
  if (admin) return { db: admin, client: "admin" };
  const anon = getSupabaseBrowser();
  if (anon) return { db: anon, client: "anon" };
  return { db: null, client: "none" };
}
