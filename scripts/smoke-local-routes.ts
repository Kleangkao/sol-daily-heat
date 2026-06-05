/**
 * Lightweight local route smoke test (no Playwright).
 * Run: npx tsx scripts/smoke-local-routes.ts [--base http://localhost:3000]
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";

const DEFAULT_BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

type CheckResult = { path: string; status: number; ok: boolean; note?: string };

async function fetchStatus(base: string, path: string): Promise<CheckResult> {
  const url = `${base.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    return {
      path,
      status: res.status,
      ok: res.status >= 200 && res.status < 400,
    };
  } catch (err) {
    return {
      path,
      status: 0,
      ok: false,
      note: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

async function resolveSampleIds(): Promise<{ topicId?: string; mint?: string }> {
  const db = getSupabaseAdmin();
  if (!db) return {};

  const date = new Date().toISOString().slice(0, 10);
  const { data: ranking } = await db
    .from("daily_rankings")
    .select("topic_id")
    .eq("ranking_date", date)
    .eq("section", "top_heat")
    .order("rank_position", { ascending: true })
    .limit(1)
    .maybeSingle();

  const topicId = ranking?.topic_id as string | undefined;

  const { data: token } = await db
    .from("tokens")
    .select("mint_address")
    .not("mint_address", "is", null)
    .limit(1)
    .maybeSingle();

  return {
    topicId,
    mint: token?.mint_address as string | undefined,
  };
}

async function main() {
  const baseIdx = process.argv.indexOf("--base");
  const base =
    baseIdx >= 0 ? process.argv[baseIdx + 1] : DEFAULT_BASE;

  const paths = ["/", "/api/health", "/robots.txt", "/sitemap.xml"];
  const { topicId, mint } = await resolveSampleIds();
  if (topicId) paths.push(`/topics/${topicId}`);
  if (mint) paths.push(`/tokens/${mint}`);

  console.log(`\nSmoke test — ${base}\n`);

  const results: CheckResult[] = [];
  for (const path of paths) {
    const result = await fetchStatus(base, path);
    results.push(result);
    const icon = result.ok ? "✓" : "✗";
    console.log(
      `${icon} ${path} → ${result.status || "ERR"}${result.note ? ` (${result.note})` : ""}`
    );
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.log(`\nFAIL — ${failed.length} route(s) failed. Is dev server running?\n`);
    process.exitCode = 1;
  } else {
    console.log(`\nPASS — ${results.length} routes OK.\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
