/**
 * Audit reader-facing card copy across all homepage sections.
 * Run: npx tsx scripts/audit-reader-copy-coverage.ts [--date YYYY-MM-DD]
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { fetchHeatDashboard } from "../lib/db/queries/heat-today";
import { mergeDashboard } from "../lib/db/merge-dashboard";
import { getDemoDashboard } from "../lib/mock/demo-data";
import { DASHBOARD_SECTIONS } from "../lib/db/dashboard-sections";
import type { HeatCardView } from "../lib/types/heat";
import {
  buildReaderDisplayCopy,
  readerCopyInputFromCard,
} from "../lib/heat/reader-signal-copy";

type FlaggedCard = {
  section: string;
  rank: number | string;
  title: string;
  sourceSlugs: string;
  summary: string;
  whyRanked: string;
  whyHot: string;
  reasons: string[];
};

const READER_FRIENDLY_MARKERS =
  /scanner|evidence panel|protocol-activity signal|trigger the scanner|early narrative|market-discovery|DexScreener paid visibility/i;

function looksLikeRawMetricSummary(summary: string): boolean {
  if (READER_FRIENDLY_MARKERS.test(summary)) return false;
  if (summary.includes("·") && /fees?\s+(up|down)|%\s*\(24h\)|24h fees/i.test(summary)) {
    return true;
  }
  if (/via DefiLlama/i.test(summary) && /fees?\s+(up|down)|24h fees/i.test(summary)) {
    return true;
  }
  if (/fees\s+(up|down)\s+[\d,.]+%/i.test(summary) && summary.length > 60) {
    return true;
  }
  return false;
}

function auditFields(copy: ReturnType<typeof buildReaderDisplayCopy>): string[] {
  const reasons: string[] = [];
  const { summary, whyRanked, whyHot } = copy;

  if (/adapter signal/i.test(summary)) reasons.push("summary: adapter signal");
  if (/adapter signal/i.test(whyRanked)) reasons.push("whyRanked: adapter signal");
  if (/adapter signal/i.test(whyHot)) reasons.push("whyHot: adapter signal");

  if (/passes fee threshold/i.test(summary)) reasons.push("summary: passes fee threshold");
  if (/passes fee threshold/i.test(whyRanked)) reasons.push("whyRanked: passes fee threshold");
  if (/passes fee threshold/i.test(whyHot)) reasons.push("whyHot: passes fee threshold");

  if (/^\s*1 adapter signal\s*\(fees move\)\s*$/i.test(whyHot)) {
    reasons.push("whyHot: raw fees move label");
  }
  if (/\bfees move\b/i.test(whyHot) && !READER_FRIENDLY_MARKERS.test(whyHot)) {
    reasons.push("whyHot: internal fees move phrase");
  }

  if (/^metric signal only$/i.test(summary.trim())) {
    reasons.push("summary: metric-only stub");
  }
  if (/^metric signal only$/i.test(whyHot.trim())) {
    reasons.push("whyHot: metric-only stub");
  }

  if (looksLikeRawMetricSummary(summary)) {
    reasons.push("summary: raw metric pipeline text");
  }

  if (/^1 editorial source$/i.test(whyHot.trim())) {
    reasons.push("whyHot: editorial count only");
  }

  return reasons;
}

function auditCard(section: string, card: HeatCardView, index: number): FlaggedCard | null {
  const copy = buildReaderDisplayCopy(readerCopyInputFromCard(card));
  const reasons = auditFields(copy);
  if (reasons.length === 0) return null;

  return {
    section,
    rank: card.rankPosition ?? index + 1,
    title: card.title,
    sourceSlugs: (card.sourceSlugs ?? []).join(", ") || "—",
    summary: copy.summary,
    whyRanked: copy.whyRanked,
    whyHot: copy.whyHot,
    reasons,
  };
}

async function main() {
  const dateArg = process.argv.find((a) => a.startsWith("--date="))?.split("=")[1];
  const dateIdx = process.argv.indexOf("--date");
  const date =
    dateArg ?? (dateIdx >= 0 ? process.argv[dateIdx + 1] : undefined);

  const db = getSupabaseAdmin();
  const mock = getDemoDashboard(date);
  let dashboard = mock;

  if (db) {
    const live = await fetchHeatDashboard(db, date);
    dashboard = mergeDashboard(live, mock);
  } else {
    console.warn("No Supabase admin client — auditing mock dashboard only.");
  }

  const flagged: FlaggedCard[] = [];
  let totalCards = 0;

  for (const { dataKey } of DASHBOARD_SECTIONS) {
    const items = dashboard[dataKey] as HeatCardView[];
    items.forEach((card, i) => {
      totalCards += 1;
      const row = auditCard(dataKey, card, i);
      if (row) flagged.push(row);
    });
  }

  console.log(`\nReader copy coverage audit — ${dashboard.date}`);
  console.log(`dataSource: ${dashboard.dataSource ?? "unknown"}`);
  console.log(`cards scanned: ${totalCards}`);
  console.log(`flagged: ${flagged.length}\n`);

  if (flagged.length === 0) {
    console.log("PASS — no card-level internal/debug copy issues.\n");
  } else {
    console.log("FAIL — flagged cards:\n");
    console.table(
      flagged.map((f) => ({
        section: f.section,
        rank: f.rank,
        title: f.title.slice(0, 60),
        reasons: f.reasons.join("; "),
      }))
    );
    for (const f of flagged) {
      console.log(`\n--- ${f.section} #${f.rank}: ${f.title} ---`);
      console.log("sourceSlugs:", f.sourceSlugs);
      console.log("summary:", f.summary);
      console.log("whyRanked:", f.whyRanked);
      console.log("whyHot:", f.whyHot);
      console.log("reasons:", f.reasons.join(", "));
    }
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
