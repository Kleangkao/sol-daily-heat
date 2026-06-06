import type { TopicCategory } from "@/lib/types/db";
import type { Source } from "@/lib/types/db";
import { formatSignalLabels, type ClusterMetrics } from "./cluster-metrics";

type SummaryItem = {
  title: string;
  snippet?: string | null;
  metadata_json?: Record<string, unknown>;
  sources?: Source;
};

export type SummaryContext = {
  itemTypes: string[];
  items: SummaryItem[];
};

export function uniqueSnippets(snippets: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of snippets) {
    const s = raw.trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

function shortMint(addr: unknown): string | undefined {
  if (typeof addr !== "string" || addr.length < 12) return undefined;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function buildMarketSummary(title: string, items: SummaryItem[]): string {
  const meta = items[0]?.metadata_json ?? {};
  const sym = typeof meta.symbol === "string" ? meta.symbol : undefined;
  const mint = shortMint(meta.tokenAddress ?? meta.mint);
  const vol = typeof meta.volume_h24 === "number" ? meta.volume_h24 : undefined;
  const liq = typeof meta.liquidity_usd === "number" ? meta.liquidity_usd : undefined;
  const signal = meta.signal as string | undefined;
  const src = items[0]?.sources?.name ?? "DexScreener";

  const parts: string[] = [];
  if (sym) parts.push(sym);
  else if (mint) parts.push(mint);

  if (signal === "boost") {
    parts.push("on DexScreener paid boost leaderboard");
  } else if (signal === "new_pair") {
    parts.push("new Solana DEX pair");
    if (vol != null) parts.push(`24h vol ~$${formatUsd(vol)}`);
    if (liq != null) parts.push(`liquidity ~$${formatUsd(liq)}`);
  } else {
    parts.push(title.replace(/^DexScreener boost:\s*/i, "").trim() || "market signal");
  }

  parts.push(`via ${src}`);
  return parts.join(" · ").slice(0, 280);
}

export function buildProtocolSummary(title: string, items: SummaryItem[]): string {
  const meta = items[0]?.metadata_json ?? {};
  const name = title.split(":")[0]?.trim() || title;
  const change = typeof meta.change_1d === "number" ? meta.change_1d : undefined;
  const tvl = typeof meta.tvl === "number" ? meta.tvl : undefined;
  const total24h = typeof meta.total24h === "number" ? meta.total24h : undefined;
  const signal = meta.signal as string | undefined;
  const cat = typeof meta.category === "string" ? meta.category : "DeFi";
  const src = items[0]?.sources?.name ?? "DefiLlama";
  const metricLabel =
    signal === "fees_move" || signal === "chain_fees" ? "fees" : "TVL";

  const parts: string[] = [name];
  if (change != null) {
    const dir = change >= 0 ? "up" : "down";
    parts.push(`${metricLabel} ${dir} ${Math.abs(change).toFixed(1)}% (24h)`);
  }
  if (total24h != null && metricLabel === "fees") {
    parts.push(`24h fees ~$${formatUsd(total24h)}`);
  } else if (tvl != null) {
    parts.push(`TVL ~$${formatUsd(tvl)}`);
  }
  parts.push(cat);
  parts.push(`via ${src}`);
  return parts.join(" · ").slice(0, 280);
}

export function buildRuleSummary(
  title: string,
  snippets: string[],
  ctx?: SummaryContext
): string {
  const deduped = uniqueSnippets(snippets);
  const itemTypes = ctx?.itemTypes ?? [];
  const items = ctx?.items ?? [];

  const headlineOnly =
    items.length > 0 &&
    items.every((i) => i.metadata_json?.sitemap_discovery === true);
  if (headlineOnly) {
    return `Headline-only discovery (SolanaFloor sitemap): "${title}". Open the article URL for full story. Body not ingested.`.slice(
      0,
      280
    );
  }

  const marketOnly =
    itemTypes.length > 0 && itemTypes.every((t) => t === "market");
  const protocolHeavy =
    itemTypes.includes("protocol") &&
    !itemTypes.some((t) => t === "news" || t === "manual");

  if (marketOnly || (itemTypes.includes("market") && deduped.length <= 1)) {
    return buildMarketSummary(title, items.length ? items : [{ title, snippet: deduped[0] ?? "" }]);
  }
  if (protocolHeavy) {
    return buildProtocolSummary(title, items.length ? items : [{ title, snippet: deduped[0] ?? "" }]);
  }

  if (deduped.length === 1) {
    return deduped[0].slice(0, 280) + (deduped[0].length > 280 ? "…" : "");
  }
  if (deduped.length > 1) {
    const joined = deduped.slice(0, 2).join(" · ");
    return joined.slice(0, 280) + (joined.length > 280 ? "…" : "");
  }

  return `${title}. Clustered from ${items.length || 1} source signal(s).`;
}

export function inferCategory(
  text: string,
  itemTypes: string[]
): TopicCategory {
  const t = text.toLowerCase();
  if (itemTypes.includes("market")) {
    if (/meme|pump|bonk|wif|pepe|dog/i.test(t)) return "meme";
    return "ecosystem";
  }
  if (itemTypes.includes("protocol") || /tvl|defi|liquidity|stake|lend/i.test(t)) return "defi";
  if (/nft|metaplex|magic eden/i.test(t)) return "nft";
  if (/game|star atlas|gaming/i.test(t)) return "gaming";
  if (/firedancer|validator|infra|rpc|oracle|status|incident|pyth/i.test(t)) return "infra";
  if (/marinade|orca|sanctum|lst|restaking|liquid stake/i.test(t)) return "defi";
  if (/ai|inference|gpu/i.test(t)) return "ai";
  if (/sec|regulat|compliance/i.test(t)) return "regulatory";
  if (/solana|ecosystem|foundation/i.test(t)) return "ecosystem";
  return "other";
}

export function buildWhyHot(metrics: ClusterMetrics): string {
  const parts: string[] = [];

  if (metrics.editorialSourceCount > 0) {
    parts.push(
      `${metrics.editorialSourceCount} editorial source${
        metrics.editorialSourceCount === 1 ? "" : "s"
      }`
    );
  }

  if (metrics.signalCount > 0) {
    const countLabel =
      metrics.signalCount === 1
        ? "1 adapter signal"
        : `${metrics.signalCount} adapter signals`;
    if (metrics.uniqueSignals.length > 0) {
      parts.push(`${countLabel} (${formatSignalLabels(metrics.uniqueSignals)})`);
    } else {
      parts.push(countLabel);
    }
  }

  if (parts.length === 0) return "Clustered signals";
  return parts.join(" · ");
}

export function defaultRiskNote(): string {
  return "Context and signal only. Not investment advice. Verify primary sources.";
}

export function buildCreatorAngle(title: string, category: TopicCategory): string {
  return `Creator angle (${category}): Break down "${title.slice(0, 60)}" with on-chain proof and official links. Avoid price calls.`;
}

export function buildInvestorWatchline(title: string): string {
  return `Watchlist context: Monitor "${title.slice(0, 50)}" for follow-through volume and governance updates. Not a buy/sell signal.`;
}
