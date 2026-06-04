import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseBrowser } from "@/lib/env";

let browser: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (!hasSupabaseBrowser()) return null;
  const url = getSupabaseUrl()!;
  const key = getSupabaseAnonKey()!;
  if (!browser) {
    browser = createClient(url, key);
  }
  return browser;
}
