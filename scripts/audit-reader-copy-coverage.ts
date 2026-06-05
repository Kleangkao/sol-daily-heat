/**
 * Audit reader-facing homepage card copy across all sections.
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
  buildHomepageCardCopy,
  type HomepageCardCopy,
} from "../lib/heat/homepage-card-copy";
import { readerCopyInputFromCard } from "../lib/heat/reader-signal-copy";

type FlaggedCard = {
  section: string;
  rank: number | string;
  title: string;
  sourceSlugs: string;
  signalLabel: string;
  brief: string;
  reasons: string[];
};

const READER_FRIENDLY_MARKERS =
  /scanner|evidence panel|protocol-activity signal|trigger the scanner|early narrative|market-discovery|DexScreener paid visibility|verify the raw evidence/i;

function looksLikeRawMetricBrief(brief: string): boolean {
  if (READER_FRIENDLY_MARKERS.test(brief)) return false;
  if (brief.includes("·") && /fees?\s+(up|down)|%\s*\(24h\)|24h fees/i.test(brief)) {
    return true;
  }
  if (/via DefiLlama/i.test(brief) && /fees?\s+(up|down)|24h fees/i.test(brief)) {
    return true;
  }
  return false;
}

function auditFields(copy: HomepageCardCopy): string[] {
  const reasons: string[] = [];
  const { signalLabel, brief } = copy;

  if (/adapter signal/i.test(brief)) reasons.push("brief: adapter signal");
  if (/adapter signal/i.test(signalLabel)) reasons.push("signalLabel: adapter signal");
  if (/passes fee threshold/i.test(brief)) reasons.push("brief: passes fee threshold");
  if (/Why ranked/i.test(brief)) reasons.push("brief: Why ranked prefix");
  if (/WHY HOT/i.test(brief)) reasons.push("brief: WHY HOT block");

  if (/^\s*1 adapter signal\s*\(fees move\)\s*$/i.test(brief)) {
    reasons.push("brief: raw fees move label");
  }
  if (looksLikeRawMetricBrief(brief)) {
    reasons.push("brief: raw metric pipeline text");
  }

  return reasons;
}

function auditCard(section: string, card: HeatCardView, index: number): FlaggedCard | null {
  const copy = buildHomepageCardCopy(readerCopyInputFromCard(card));
  const reasons = auditFields(copy);
  if (reasons.length === 0) return null;

  return {
    section,
    rank: card.rankPosition ?? index + 1,
    title: card.title,
    sourceSlugs: (card.sourceSlugs ?? []).join(", ") || "—",
    signalLabel: copy.signalLabel,
    brief: copy.brief,
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
      console.log("signalLabel:", f.signalLabel);
      console.log("brief:", f.brief);
      console.log("reasons:", f.reasons.join(", "));
    }
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
