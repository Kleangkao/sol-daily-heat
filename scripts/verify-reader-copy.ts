/**
 * Manual snapshot checks for reader-facing copy (homepage cards + legacy fields).
 * Run: npx tsx scripts/verify-reader-copy.ts
 */
import {
  buildReaderDisplayCopy,
  type ReaderCopyInput,
} from "../lib/heat/reader-signal-copy";
import { buildHomepageCardCopy } from "../lib/heat/homepage-card-copy";
import { buildPersonaDisplayNote } from "../lib/heat/persona-display-copy";

function printHomepageExample(label: string, input: ReaderCopyInput) {
  const copy = buildHomepageCardCopy(input);
  console.log(`\n=== Homepage: ${label} ===`);
  console.log("Signal label:", copy.signalLabel);
  if (copy.mixedMetricHint) console.log("Mixed metric hint:", copy.mixedMetricHint);
  console.log("Brief:", copy.brief);
  if (copy.caution) console.log("Caution:", copy.caution);
  const creator = buildPersonaDisplayNote("creator", input, "Creator angle (defi): Break down \"test\"");
  const investor = buildPersonaDisplayNote("investor", input, "Watchlist context: Monitor \"test\"");
  console.log("Creator persona:", creator);
  console.log("Investor persona:", investor);
}

printHomepageExample("Metric-only fee topic", {
  title: "Jupiter Staked SOL: fees up 2513.7% (24h)",
  summary:
    "Jupiter Staked SOL · fees up 2513.7% (24h) · 24h fees ~$112K · DeFi · via DefiLlama",
  whyHot: "1 adapter signal (fees move)",
  scoreBreakdown: { fee_threshold_passed: 12, fee_small_base_discount: -5 },
  sourceSlugs: ["defillama-fees-solana"],
  itemTypes: ["protocol"],
  rankingSignals: ["fees_move"],
  sourceCount: 1,
});

printHomepageExample("Single-source editorial topic", {
  title: "Solana Now Has Native Subscriptions & Allowances",
  summary:
    "Recurring payments and delegated spending are now available as a shared onchain primitive.",
  sourceSlugs: ["solana-blog"],
  itemTypes: ["news"],
  rankingSignals: [],
  sourceCount: 1,
});

printHomepageExample("TVL metric topic", {
  title: "Meteora DAMM V2: TVL down 25.0% (24h)",
  summary:
    "Meteora DAMM V2 TVL ~$420M (DeFi) · 24h down 25.0%",
  scoreBreakdown: { volume_signal: 12 },
  sourceSlugs: ["defillama-solana"],
  itemTypes: ["protocol"],
  rankingSignals: ["tvl_move"],
  sourceCount: 1,
});

printHomepageExample("Mixed metric topic (fees + TVL)", {
  title: "Meteora DAMM V2: TVL down 25.0% (24h)",
  summary:
    "Meteora DAMM V2 · fees up 158.7% (24h) · 24h fees ~$216K · TVL down 25.0%",
  scoreBreakdown: { fee_threshold_passed: 12, volume_signal: 8 },
  sourceSlugs: ["defillama-fees-solana", "defillama-solana"],
  itemTypes: ["protocol"],
  rankingSignals: ["fees_move", "tvl_move"],
  sourceCount: 2,
});

printHomepageExample("Promoted boost", {
  title: "DexScreener boost: 4b1i…pump",
  summary: "4b1i…pump · on DexScreener paid boost leaderboard",
  sourceSlugs: ["dexscreener-solana"],
  itemTypes: ["market"],
  rankingSignals: ["boost"],
  sourceCount: 1,
});

const legacy = buildReaderDisplayCopy({
  title: "Solana chain fees +38.9% (24h)",
  summary: "Solana chain fees +38.9% (24h) · 24h fees ~$7.7M",
  sourceSlugs: ["defillama-fees-solana"],
  itemTypes: ["protocol"],
  rankingSignals: ["chain_fees"],
  sourceCount: 1,
});
console.log("\n=== Legacy reader copy (topic detail helpers still use) ===");
console.log("Summary:", legacy.summary.slice(0, 120));
