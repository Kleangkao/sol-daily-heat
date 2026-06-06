import { utcAvailableDates } from "@/lib/heat/snapshot-date";
import type { HeatCardView, HeatDashboardData } from "@/lib/types/heat";
import type { StoryTimeKind } from "@/lib/heat/story-timestamp";

type CardInput = Omit<HeatCardView, "storyAt" | "storyTimeKind"> & {
  storyAt?: string;
  storyTimeKind?: StoryTimeKind;
};

const dates = utcAvailableDates();

function card(partial: CardInput): HeatCardView {
  return {
    ...partial,
    storyAt: partial.storyAt ?? partial.lastUpdated,
    storyTimeKind: partial.storyTimeKind ?? "published",
  };
}

const topHeat: HeatCardView[] = [
  card({
    id: "t1",
    title: "Firedancer testnet milestone drives infra narrative",
    summary:
      "Multiple ecosystem outlets report a new Firedancer testnet cut with improved throughput benchmarks, reviving Solana infra discourse.",
    category: "infra",
    heatScore: 92,
    sourceCount: 5,
    firstSeen: new Date(Date.now() - 6 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 45 * 60000).toISOString(),
    whyHot:
      "Cross-source coverage within 6h, high-reliability RSS hits, and keyword cluster match on “Firedancer” + “testnet”.",
    relatedTokens: [],
    relatedProjects: [{ name: "Solana Labs", type: "project" }],
    riskNote: "Context only. Not investment advice. Verify official release notes.",
    interpretationType: "rule_based",
    confidence: 0.88,
    scoreBreakdown: {
      source_diversity: 18,
      recency: 22,
      reliability_weight: 20,
      keyword_match: 32,
    },
  }),
  card({
    id: "t2",
    title: "Jupiter perps volume spike on Solana",
    summary:
      "DexScreener and DeFi dashboards show elevated perps flow; traders discussing funding and open interest on social channels.",
    category: "defi",
    heatScore: 87,
    sourceCount: 4,
    firstSeen: new Date(Date.now() - 10 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 2 * 3600000).toISOString(),
    whyHot: "Volume signal above 7-day baseline + 3 independent source mentions.",
    relatedTokens: [{ symbol: "JUP", name: "Jupiter" }],
    relatedProjects: [{ name: "Jupiter", slug: "jupiter", type: "protocol" }],
    riskNote: "Perps carry liquidation risk. Signal ≠ recommendation.",
    interpretationType: "rule_based",
    confidence: 0.82,
  }),
  card({
    id: "t3",
    title: "Memecoin launch cluster: 12 new pairs in 24h",
    summary:
      "DexScreener flagged a burst of new Solana pairs with sub-$500k liquidity. Typical launch-day pattern.",
    category: "meme",
    heatScore: 79,
    sourceCount: 2,
    firstSeen: new Date(Date.now() - 4 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 90 * 60000).toISOString(),
    whyHot: "Pair-creation velocity threshold exceeded; low reliability sources discounted.",
    relatedTokens: [
      { symbol: "BONK", name: "Bonk" },
      { symbol: "WIF", name: "dogwifhat" },
    ],
    relatedProjects: [],
    riskNote: "Extreme volatility and rug risk on new launches. DYOR.",
    interpretationType: "rule_based",
    confidence: 0.65,
  }),
  card({
    id: "t4",
    title: "Phantom wallet ships creator payout preview",
    summary:
      "Wallet team teases in-app creator monetization tools for Solana NFT and content sellers.",
    category: "ecosystem",
    heatScore: 74,
    sourceCount: 3,
    firstSeen: new Date(Date.now() - 14 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 5 * 3600000).toISOString(),
    whyHot: "Official blog + two RSS mirrors; creator-angle tag applied.",
    relatedTokens: [],
    relatedProjects: [{ name: "Phantom", type: "app" }],
    riskNote: "Pre-release feature. Timeline may shift.",
    interpretationType: "rule_based",
    confidence: 0.79,
  }),
];

const newTokens: HeatCardView[] = [
  card({
    id: "nt1",
    title: "$PULSE new pair on Raydium (4h old)",
    summary: "First liquidity add detected via DexScreener; thin book, high slippage.",
    category: "meme",
    heatScore: 68,
    sourceCount: 1,
    firstSeen: new Date(Date.now() - 4 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 30 * 60000).toISOString(),
    whyHot: "New pair age < 24h and initial volume above scanner floor.",
    relatedTokens: [{ symbol: "PULSE", mintAddress: "Pulse…mock" }],
    relatedProjects: [{ name: "Raydium", type: "protocol" }],
    riskNote: "Unaudited token. Liquidity may be removed.",
    interpretationType: "raw",
    confidence: 0.55,
  }),
  card({
    id: "nt2",
    title: "$GRID infra token listing",
    summary: "Small-cap infra narrative token gaining mentions in Solana dev Discord mirrors.",
    category: "infra",
    heatScore: 61,
    sourceCount: 2,
    firstSeen: new Date(Date.now() - 8 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 3 * 3600000).toISOString(),
    whyHot: "Keyword “validator” + new mint within 48h.",
    relatedTokens: [{ symbol: "GRID" }],
    relatedProjects: [],
    riskNote: "Low float. Watch for concentrated wallets.",
    interpretationType: "rule_based",
    confidence: 0.58,
  }),
];

const defiSignals: HeatCardView[] = [
  card({
    id: "d1",
    title: "Kamino TVL +8% day-over-day",
    summary: "DefiLlama snapshot shows Kamino lending TVL climbing on Solana.",
    category: "defi",
    heatScore: 81,
    sourceCount: 2,
    firstSeen: new Date(Date.now() - 12 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 1 * 3600000).toISOString(),
    whyHot: "TVL delta exceeds +5% threshold with stable API feed.",
    relatedTokens: [],
    relatedProjects: [{ name: "Kamino", slug: "kamino", type: "protocol" }],
    riskNote: "TVL can move with incentives; check utilization, not headline only.",
    interpretationType: "rule_based",
    confidence: 0.84,
    scoreBreakdown: { tvl_delta: 40, reliability_weight: 25, recency: 16 },
  }),
  card({
    id: "d2",
    title: "Marinade mSOL stake flow uptick",
    summary: "Liquid staking deposits trending up amid validator discussion.",
    category: "defi",
    heatScore: 72,
    sourceCount: 3,
    firstSeen: new Date(Date.now() - 20 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 4 * 3600000).toISOString(),
    whyHot: "Stake flow metric + ecosystem RSS overlap.",
    relatedTokens: [{ symbol: "mSOL", name: "Marinade staked SOL" }],
    relatedProjects: [{ name: "Marinade", type: "protocol" }],
    riskNote: "Staking carries smart-contract and depeg risks.",
    interpretationType: "rule_based",
    confidence: 0.77,
  }),
];

const builderWatch: HeatCardView[] = [
  card({
    id: "b1",
    title: "Firedancer testnet milestone drives infra narrative",
    summary:
      "Ecosystem outlets report a new Firedancer testnet cut with improved throughput benchmarks. Builder-relevant client upgrade signal.",
    category: "infra",
    heatScore: 92,
    sourceCount: 5,
    firstSeen: new Date(Date.now() - 6 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 45 * 60000).toISOString(),
    whyHot:
      "Cross-source coverage; keyword cluster on Firedancer, testnet, and validator client path.",
    relatedTokens: [],
    relatedProjects: [{ name: "Solana Labs", type: "project" }],
    riskNote: "Infrastructure context only. Not investment advice.",
    interpretationType: "rule_based",
    confidence: 0.88,
    sourceSlugs: ["helius-blog", "solana-blog"],
    itemTypes: ["news"],
  }),
  card({
    id: "b2",
    title: "Helius RPC throughput guide for high-volume apps",
    summary:
      "Helius blog outlines RPC routing, rate limits, and SDK patterns for Solana developers shipping mainnet workloads.",
    category: "infra",
    heatScore: 68,
    sourceCount: 2,
    firstSeen: new Date(Date.now() - 20 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 8 * 3600000).toISOString(),
    whyHot: "Official infra source; developer tooling and API keywords.",
    relatedTokens: [],
    relatedProjects: [{ name: "Helius", type: "project" }],
    riskNote: "Verify against your own RPC provider SLAs.",
    interpretationType: "rule_based",
    confidence: 0.74,
    sourceSlugs: ["helius-blog"],
    itemTypes: ["news"],
  }),
  card({
    id: "b3",
    title: "Pyth oracle feed latency incident resolved",
    summary:
      "Status feed documents a short Hermes latency spike; relevant for apps depending on Pyth price updates.",
    category: "infra",
    heatScore: 55,
    sourceCount: 1,
    firstSeen: new Date(Date.now() - 12 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 4 * 3600000).toISOString(),
    whyHot: "Fresh status signal with oracle/infra keywords.",
    relatedTokens: [],
    relatedProjects: [{ name: "Pyth", type: "protocol" }],
    riskNote: "Status items are operational context, not trade signals.",
    interpretationType: "rule_based",
    confidence: 0.7,
    sourceSlugs: ["pyth-status"],
    itemTypes: ["news"],
  }),
];

const creatorAngles: HeatCardView[] = [
  card({
    id: "c1",
    title: "Thread hook: “Solana infra week” recap format",
    summary:
      "Template: 5-bullet recap of Firedancer + Phantom + one DeFi signal. Good for educational threads.",
    category: "ecosystem",
    heatScore: 70,
    sourceCount: 1,
    firstSeen: new Date(Date.now() - 3 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 3 * 3600000).toISOString(),
    whyHot: "Rule-based creator template matched top infra + wallet stories.",
    relatedTokens: [],
    relatedProjects: [],
    riskNote: "Creator templates are starting points. Add your own verification.",
    interpretationType: "rule_based",
    confidence: 0.7,
  }),
  card({
    id: "c2",
    title: "Clip angle: Jupiter perps UI walkthrough",
    summary: "Short-form demo of limit vs market perps on Solana. Ties to volume spike story.",
    category: "defi",
    heatScore: 66,
    sourceCount: 2,
    firstSeen: new Date(Date.now() - 7 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 2 * 3600000).toISOString(),
    whyHot: "Linked to heat topic t2; suggested B-roll: DexScreener pair chart.",
    relatedTokens: [{ symbol: "JUP" }],
    relatedProjects: [{ name: "Jupiter", type: "protocol" }],
    riskNote: "Disclose affiliate links if used.",
    interpretationType: "rule_based",
    confidence: 0.68,
  }),
];

const investorWatchlist: HeatCardView[] = [
  card({
    id: "w1",
    title: "Watch: SOL ecosystem infra spend narrative",
    summary:
      "Investors tracking validator/client upgrades and RPC reliability post-Firedancer news.",
    category: "infra",
    heatScore: 75,
    sourceCount: 4,
    firstSeen: new Date(Date.now() - 24 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 6 * 3600000).toISOString(),
    whyHot: "Sustained multi-source coverage; watchlist tag from manual curator seed.",
    relatedTokens: [{ symbol: "SOL", name: "Solana" }],
    relatedProjects: [{ name: "Solana", type: "project" }],
    riskNote: "Watchlist ≠ buy/sell. Macro and regulatory context still applies.",
    interpretationType: "rule_based",
    confidence: 0.8,
  }),
  card({
    id: "w2",
    title: "Watch: DeFi TVL leaders rotation",
    summary: "Kamino and Marinade signals may indicate capital rotation within Solana DeFi.",
    category: "defi",
    heatScore: 71,
    sourceCount: 3,
    firstSeen: new Date(Date.now() - 18 * 3600000).toISOString(),
    lastUpdated: new Date(Date.now() - 3 * 3600000).toISOString(),
    whyHot: "Correlated TVL + stake signals across two protocols.",
    relatedTokens: [],
    relatedProjects: [
      { name: "Kamino", type: "protocol" },
      { name: "Marinade", type: "protocol" },
    ],
    riskNote: "Compare against broader crypto beta before sizing exposure.",
    interpretationType: "rule_based",
    confidence: 0.76,
  }),
];

export function getDemoDashboard(date?: string): HeatDashboardData {
  const selected = date && dates.includes(date) ? date : dates[0];
  return {
    date: selected,
    availableDates: dates,
    topHeat,
    newTokens,
    defiSignals,
    builderWatch,
    creatorAngles,
    investorWatchlist,
    dataSource: "mock",
    sectionSources: {
      topHeat: "mock",
      newTokens: "mock",
      defiSignals: "mock",
      builderWatch: "mock",
      creatorAngles: "mock",
      investorWatchlist: "mock",
    },
  };
}

export function filterByCategory(
  items: HeatCardView[],
  category: import("@/lib/types/db").TopicCategory
): HeatCardView[] {
  return items.filter((i) => i.category === category);
}
