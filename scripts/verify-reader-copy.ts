/**
 * Manual snapshot checks for reader-facing signal copy.
 * Run: npx tsx scripts/verify-reader-copy.ts
 */
import {
  buildReaderDisplayCopy,
  type ReaderCopyInput,
} from "../lib/heat/reader-signal-copy";

function printExample(label: string, input: ReaderCopyInput) {
  const copy = buildReaderDisplayCopy(input);
  console.log(`\n=== ${label} ===`);
  console.log("Why ranked:", copy.whyRanked);
  console.log("Why hot:", copy.whyHot);
  console.log("Summary:", copy.summary);
  if (copy.pctCaution) console.log("Caution:", copy.pctCaution);
}

printExample("Metric-only fee topic", {
  title: "Jupiter Staked SOL: fees up 2513.7% (24h)",
  summary:
    "Jupiter Staked SOL · fees up 2513.7% (24h) · 24h fees ~$112K · DeFi · via DefiLlama",
  whyHot: "1 adapter signal (fees move)",
  scoreBreakdown: { fee_threshold_passed: 12, fee_small_base_discount: -5 },
  sourceSlugs: ["defillama-solana"],
  itemTypes: ["protocol"],
  rankingSignals: ["fees_move"],
  sourceCount: 1,
});

printExample("Single-source editorial topic", {
  title: "Solayer rolls out Solana-native onchain perps trading platform Margin Trade mainnet",
  summary:
    "Solayer is launching a native onchain perps venue on Solana with margin trade mainnet access.",
  whyHot: "1 editorial source",
  sourceSlugs: ["solana-blog"],
  itemTypes: ["news"],
  rankingSignals: [],
  sourceCount: 1,
});

printExample("Solana chain fees (non-colon title)", {
  title: "Solana chain fees +38.9% (24h)",
  summary:
    "Solana chain fees +38.9% (24h) · fees up 38.9% (24h) · 24h fees ~$7.7M · DeFi · via DefiLlama — Solana Fees",
  whyHot: "1 adapter signal (fees move)",
  scoreBreakdown: { fee_threshold_passed: 1 },
  sourceSlugs: ["defillama-fees-solana"],
  itemTypes: ["protocol"],
  rankingSignals: ["chain_fees"],
  sourceCount: 1,
  category: "defi",
});

printExample("pump.fun fees down (colon title)", {
  title: "pump.fun: fees down 17.0% (24h)",
  summary:
    "pump.fun · fees down 17.0% (24h) · 24h fees ~$1.2M · DeFi · via DefiLlama — Solana Fees",
  whyHot: "1 adapter signal (fees move)",
  sourceSlugs: ["defillama-fees-solana"],
  itemTypes: ["protocol"],
  rankingSignals: ["fees_move"],
  sourceCount: 1,
  category: "defi",
});

printExample("Promoted boost topic", {
  title: "DexScreener boost: Fuu6…pump",
  summary: "Fuu6…pump · on DexScreener paid boost leaderboard · via DexScreener",
  whyHot: "1 adapter signal (DexScreener boost)",
  sourceSlugs: ["dexscreener-solana"],
  itemTypes: ["market"],
  rankingSignals: ["boost"],
  sourceCount: 1,
});
