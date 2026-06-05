/**
 * Inspect whether 7d/30d metric averages are feasible from stored raw_items (read-only).
 * Run: npx tsx scripts/audit-metric-history-feasibility.ts
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { RAW_ITEMS_RETENTION_DAYS } from "../lib/db/retention-policy";

type SnapshotRow = {
  fetched_at: string;
  total24h: number | null;
  change_1d: number | null;
  title: string;
};

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

async function inspectProtocolFees(
  db: ReturnType<typeof getSupabaseAdmin>,
  slug: string,
  titlePattern: RegExp
) {
  const { data: source } = await db!
    .from("sources")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!source) {
    console.log(`\n=== ${slug} ===\n(source not found)`);
    return;
  }

  const cutoffs = [
    { label: "7d", days: 7 },
    { label: "30d", days: 30 },
  ];

  for (const window of cutoffs) {
    const cutoff = new Date(Date.now() - window.days * 86400000).toISOString();
    const { data: items, error } = await db!
      .from("raw_items")
      .select("fetched_at, title, metadata_json")
      .eq("source_id", source.id)
      .gte("fetched_at", cutoff)
      .order("fetched_at", { ascending: true });
    if (error) throw error;

    const matching = (items ?? []).filter((i) => titlePattern.test(i.title as string));
    const snapshots: SnapshotRow[] = matching.map((i) => {
      const meta = (i.metadata_json ?? {}) as Record<string, unknown>;
      return {
        fetched_at: i.fetched_at as string,
        total24h: typeof meta.total24h === "number" ? meta.total24h : null,
        change_1d: typeof meta.change_1d === "number" ? meta.change_1d : null,
        title: i.title as string,
      };
    });

    const values = snapshots
      .map((s) => s.total24h)
      .filter((v): v is number => v != null);

    console.log(`\n--- ${slug} / ${window.label} window ---`);
    console.log(`raw rows (all): ${items?.length ?? 0}`);
    console.log(`matching protocol rows: ${snapshots.length}`);
    console.log(`rows with total24h: ${values.length}`);
    if (values.length > 0) {
      console.log(`avg total24h: $${Math.round(avg(values)!)}`);
      console.log(
        `date span: ${snapshots[0]?.fetched_at.slice(0, 10)} → ${snapshots[snapshots.length - 1]?.fetched_at.slice(0, 10)}`
      );
    }
  }
}

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing Supabase admin client");
    process.exit(1);
  }

  console.log("\nMetric history feasibility audit");
  console.log(`raw_items retention policy: ${RAW_ITEMS_RETENTION_DAYS} days\n`);

  await inspectProtocolFees(db, "defillama-fees-solana", /Jupiter Staked SOL/i);
  await inspectProtocolFees(db, "defillama-fees-solana", /chain fees/i);

  const { count: totalRaw } = await db
    .from("raw_items")
    .select("*", { count: "exact", head: true });
  const { count: oldRaw } = await db
    .from("raw_items")
    .select("*", { count: "exact", head: true })
    .lt("fetched_at", new Date(Date.now() - 7 * 86400000).toISOString());

  console.log("\n=== Summary ===");
  console.log(`total raw_items: ${totalRaw ?? 0}`);
  console.log(`raw_items older than 7d: ${oldRaw ?? 0}`);
  console.log("\nFeasibility:");
  console.log(
    "• 7d average: MAY be possible for frequently ingested fee protocols if multiple snapshots exist within retention."
  );
  console.log(
    "• 30d average: NOT reliable with current 7-day raw_items retention — historical rows are deleted."
  );
  console.log(
    "• Future need: longer retention or a dedicated metric_snapshots table for protocol-level daily totals."
  );
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
