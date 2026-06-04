import { runAllAdapters } from "@/lib/adapters/registry";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { upsertRawItems } from "./upsert-raw-items";
import type { Source } from "@/lib/types/db";
import type { AdapterResult } from "@/lib/adapters/types";

export type IngestSummary = {
  runId: string | null;
  results: AdapterResult[];
  totalItems: number;
  skipped: boolean;
  reason?: string;
};

export async function runIngest(): Promise<IngestSummary> {
  const db = getSupabaseAdmin();
  if (!db) {
    return {
      runId: null,
      results: [],
      totalItems: 0,
      skipped: true,
      reason: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    };
  }

  const { data: runRow, error: runErr } = await db
    .from("ingest_runs")
    .insert({ status: "running", adapter_results_json: [] })
    .select("id")
    .single();

  if (runErr) throw runErr;
  const runId = runRow.id as string;

  const { data: sources, error: srcErr } = await db
    .from("sources")
    .select("*")
    .eq("is_enabled", true);

  if (srcErr) throw srcErr;

  const { drafts, results } = await runAllAdapters((sources ?? []) as Source[]);
  let totalItems = 0;

  for (const { source, items } of drafts) {
    try {
      const n = await upsertRawItems(db, source, items);
      totalItems += n;
      await db
        .from("sources")
        .update({ last_fetched_at: new Date().toISOString(), status: "active" })
        .eq("id", source.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "upsert failed";
      const idx = results.findIndex((r) => r.slug === source.slug);
      if (idx >= 0) {
        results[idx] = { ...results[idx], ok: false, error: msg };
      }
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  const status =
    failed === 0 ? "success" : failed === results.length ? "failed" : "partial";

  await db
    .from("ingest_runs")
    .update({
      finished_at: new Date().toISOString(),
      status,
      adapter_results_json: results,
      error_summary: failed > 0 ? `${failed} adapter(s) failed` : null,
    })
    .eq("id", runId);

  return { runId, results, totalItems, skipped: false };
}
