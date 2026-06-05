/**
 * Snapshot checks for topic detail narrative briefs.
 * Run: npx tsx scripts/verify-topic-narrative-brief.ts
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { fetchHeatDashboard } from "../lib/db/queries/heat-today";
import { mergeDashboard } from "../lib/db/merge-dashboard";
import { getDemoDashboard } from "../lib/mock/demo-data";
import { getTopicDetail } from "../lib/db/queries/topic-detail";
import { buildTopicNarrativeBrief } from "../lib/heat/topic-narrative-brief";
import { buildTopicMetricEvidence } from "../lib/heat/topic-metric-evidence";
import { buildTopicMixedMetrics } from "../lib/heat/topic-mixed-metrics";
import { buildHeatScoreContext } from "../lib/heat/heat-score-context";
import type { HeatCardView } from "../lib/types/heat";

const SAMPLES = [
  { label: "Jupiter Staked SOL (metric fee)", id: "4269a535-732e-465d-9cac-fcf35377ded2" },
  { label: "Meteora mixed metric cluster", titleMatch: /Meteora DAMM V2.*fees up/i },
  { label: "Solana chain fees", titleMatch: /chain fees/i },
  { label: "Single-source editorial", titleMatch: /Solana Now Has Native|Solayer|subscriptions|Solana blog/i },
  { label: "Promoted boost", titleMatch: /^DexScreener boost/i },
];

function findCardId(cards: HeatCardView[], re: RegExp): string | undefined {
  return cards.find((c) => re.test(c.title))?.id;
}

async function main() {
  const db = getSupabaseAdmin();
  if (!db) {
    console.error("Missing Supabase admin client");
    process.exit(1);
  }

  const date = "2026-06-05";
  const dash = mergeDashboard(await fetchHeatDashboard(db, date), getDemoDashboard(date));
  const allCards = [
    ...dash.topHeat,
    ...dash.newTokens,
    ...dash.defiSignals,
    ...dash.builderWatch,
    ...dash.creatorAngles,
    ...dash.investorWatchlist,
  ];

  for (const sample of SAMPLES) {
    let id = sample.id;
    if (!id && sample.titleMatch) {
      id = findCardId(allCards, sample.titleMatch);
      if (!id) {
        console.log(`\n=== ${sample.label} ===\n(skipped — no matching topic)`);
        continue;
      }
    }
    const topic = await getTopicDetail(db, id!, date);
    if (!topic) {
      console.log(`\n=== ${sample.label} ===\n(not found)`);
      continue;
    }
    const brief = buildTopicNarrativeBrief(topic);
    const metric = buildTopicMetricEvidence(topic);
    const mixed = buildTopicMixedMetrics(topic);
    console.log(`\n=== ${sample.label}: ${topic.title.slice(0, 60)} ===`);
    console.log("mode:", brief.mode, "| heading:", brief.heading);
    if (topic.heatScore != null) {
      console.log("heat context:", buildHeatScoreContext(topic.heatScore));
    }
    brief.paragraphs.forEach((p, i) => console.log(`P${i + 1}:`, p));
    if (brief.watchNext.length) {
      console.log("Watch next:");
      brief.watchNext.forEach((w) => console.log(" •", w));
    }
    if (brief.caution) console.log("Caution:", brief.caution);
    if (brief.confidenceNote) console.log("Confidence:", brief.confidenceNote);
    if (mixed) {
      console.log("mixed metric signals:");
      mixed.signals.forEach((s) => {
        console.log(
          ` • ${s.label}: ${s.changePctLabel ?? "—"} | ${s.currentValueLabel ?? "—"} | ${s.sourceName}`
        );
      });
    } else {
      console.log("mixed metric signals: (none — single metric type)");
    }
    if (metric) {
      console.log("metric evidence:");
      console.log(" ", JSON.stringify(metric.evidence, null, 2).split("\n").join("\n  "));
      console.log(" confirmed:", metric.confirmedFacts.length, "facts");
    } else {
      console.log("metric evidence: (none — non-metric topic)");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
