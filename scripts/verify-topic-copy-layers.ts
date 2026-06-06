/**
 * Verify card / brief / evidence layers do not overlap verbatim.
 * Run: npx tsx scripts/verify-topic-copy-layers.ts
 */
import "./load-env-local";
import { getSupabaseAdmin } from "../lib/db/supabase-admin";
import { fetchHeatDashboard } from "../lib/db/queries/heat-today";
import { mergeDashboard } from "../lib/db/merge-dashboard";
import { getDemoDashboard } from "../lib/mock/demo-data";
import { getTopicDetail } from "../lib/db/queries/topic-detail";
import { buildHomepageCardCopy } from "../lib/heat/homepage-card-copy";
import { buildTopicNarrativeBrief } from "../lib/heat/topic-narrative-brief";
import {
  buildEvidenceExcerpt,
  textsOverlap,
} from "../lib/heat/topic-copy-layers";
import { isSourceExcerptOverlap } from "../lib/heat/source-presented-copy";
import {
  readerCopyInputFromCard,
  readerCopyInputFromTopic,
} from "../lib/heat/reader-signal-copy";
import { resolveTopicTimelineEntries } from "../lib/heat/topic-evidence-depth";
import type { HeatCardView } from "../lib/types/heat";

async function main() {
  const db = getSupabaseAdmin();
  if (!db) process.exit(1);

  const date = new Date().toISOString().slice(0, 10);
  const dash = mergeDashboard(await fetchHeatDashboard(db, date), getDemoDashboard(date));
  const cards: HeatCardView[] = [
    ...dash.topHeat,
    ...dash.newTokens,
    ...dash.defiSignals,
    ...dash.builderWatch,
    ...dash.creatorAngles,
    ...dash.investorWatchlist,
  ].slice(0, 12);

  let overlapFails = 0;

  for (const card of cards) {
    const topic = await getTopicDetail(db, card.id, date);
    if (!topic) continue;

    const cardCopy = buildHomepageCardCopy(readerCopyInputFromCard(card));
    const brief = buildTopicNarrativeBrief(topic);
    const timeline = resolveTopicTimelineEntries(topic);

    console.log(`\n--- ${card.title.slice(0, 55)} ---`);
    console.log("CARD:", cardCopy.brief.slice(0, 100));
    console.log("BRIEF:", brief.paragraphs[0]?.slice(0, 100) ?? "(none)");

    for (const p of brief.paragraphs) {
      if (textsOverlap(p, cardCopy.brief) && !isSourceExcerptOverlap(cardCopy.brief, p)) {
        console.log("WARN: brief overlaps card (not excerpt)");
        overlapFails += 1;
      }
    }

    for (const item of topic.evidence?.evidenceItems ?? []) {
      const excerpt = buildEvidenceExcerpt(item, [
        cardCopy.brief,
        ...brief.paragraphs,
        topic.summary,
      ]);
      if (excerpt && textsOverlap(excerpt, brief.paragraphs[0] ?? "")) {
        console.log("WARN: evidence overlaps brief:", excerpt.slice(0, 80));
        overlapFails += 1;
      }
    }

    if (timeline.length >= 2) {
      console.log(`timeline entries: ${timeline.length}`);
    }
  }

  console.log(`\nDone. overlap warnings: ${overlapFails}`);
  if (overlapFails > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
