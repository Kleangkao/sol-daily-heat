/** Environment helpers — missing keys must not break the UI. */

export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function getSupabaseServiceKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function hasSupabaseBrowser(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function hasSupabaseAdmin(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceKey());
}

export function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET;
}

/**
 * Cron auth: production MUST set CRON_SECRET or all cron POSTs return 401.
 * Development allows open cron when CRON_SECRET is unset (local testing only).
 */
export function isCronAuthorized(authHeader: string | null): boolean {
  const secret = getCronSecret();
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }
  return authHeader === `Bearer ${secret}`;
}

export function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function hasAnyAiKey(): boolean {
  return hasOpenAiKey() || hasGeminiKey();
}
