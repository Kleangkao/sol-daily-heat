import type { HeatCardView, RelatedProject, RelatedToken } from "@/lib/types/heat";
import type { HotTapeItem, PulseTokenRow } from "@/lib/market-pulse/types";

const MINT_LIKE_RE = /^[1-9A-HJ-NP-Za-km-z]{3,6}…[1-9A-HJ-NP-Za-km-z]{3,6}$/;
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type TokenDisplayIdentity = {
  primaryLabel: string;
  secondaryLabel?: string;
  symbol?: string;
  name?: string;
  mint?: string;
  isMintFallback: boolean;
};

export function shortMintAddress(mint: string): string {
  if (mint.length < 16) return mint;
  return `${mint.slice(0, 6)}…${mint.slice(-6)}`;
}

/** True when a label is a truncated mint or raw address, not a human token name. */
export function isMintLikeLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return true;
  if (MINT_LIKE_RE.test(trimmed)) return true;
  if (BASE58_RE.test(trimmed)) return true;
  if (/…/.test(trimmed) && /^[1-9A-HJ-NP-Za-km-z.…]+$/i.test(trimmed)) return true;
  return false;
}

function cleanSymbol(symbol: string): string {
  return symbol.replace(/^\$/, "").trim();
}

function primaryFromSymbol(symbol: string): string {
  const clean = cleanSymbol(symbol);
  if (!clean || isMintLikeLabel(clean)) return "";
  return `$${clean}`;
}

function primaryFromName(name: string, symbol?: string): string {
  const trimmed = name.trim();
  if (!trimmed || isMintLikeLabel(trimmed)) return "";
  const sym = symbol ? cleanSymbol(symbol) : "";
  if (sym && trimmed.toLowerCase() === sym.toLowerCase()) {
    return `$${sym}`;
  }
  return trimmed;
}

export function resolveTokenIdentity(input: {
  title: string;
  summary?: string;
  relatedTokens?: RelatedToken[];
  relatedProjects?: RelatedProject[];
}): TokenDisplayIdentity {
  const token = input.relatedTokens?.[0];
  const mint = token?.mintAddress?.trim();

  const boostMatch = input.title.match(/^DexScreener boost:\s*(.+)$/i);
  const newPairTitle = input.title.match(/^New pair:\s*([^/]+)/i);
  const dollarTitle = input.title.match(/^\$([A-Za-z0-9._-]{2,12})\b/i);

  let primaryLabel = "";
  let symbol: string | undefined;
  let name: string | undefined;

  if (token?.name) {
    const fromName = primaryFromName(token.name, token.symbol);
    if (fromName) {
      primaryLabel = fromName;
      name = token.name.trim();
    }
  }

  if (!primaryLabel && token?.symbol) {
    const fromSym = primaryFromSymbol(token.symbol);
    if (fromSym) {
      primaryLabel = fromSym;
      symbol = cleanSymbol(token.symbol);
    }
  }

  if (!primaryLabel && dollarTitle?.[1]) {
    primaryLabel = `$${dollarTitle[1]}`;
    symbol = dollarTitle[1];
  }

  if (!primaryLabel && newPairTitle?.[1]) {
    const sym = cleanSymbol(newPairTitle[1]);
    if (!isMintLikeLabel(sym)) {
      primaryLabel = `$${sym}`;
      symbol = sym;
    }
  }

  if (!primaryLabel && input.relatedProjects?.[0]?.name) {
    primaryLabel = input.relatedProjects[0].name;
  }

  if (!primaryLabel && boostMatch?.[1] && !isMintLikeLabel(boostMatch[1])) {
    primaryLabel = boostMatch[1].trim();
  }

  let isMintFallback = false;
  if (!primaryLabel) {
    if (mint) {
      primaryLabel = shortMintAddress(mint);
      isMintFallback = true;
    } else if (boostMatch?.[1]) {
      primaryLabel = boostMatch[1].trim();
      isMintFallback = isMintLikeLabel(primaryLabel);
    } else if (token?.symbol) {
      primaryLabel = cleanSymbol(token.symbol);
      isMintFallback = isMintLikeLabel(primaryLabel);
    } else {
      primaryLabel = input.title.split(":")[0]?.trim() || input.title.slice(0, 40);
      isMintFallback = false;
    }
  }

  if (token?.symbol && !symbol) {
    symbol = cleanSymbol(token.symbol);
  }

  let secondaryLabel: string | undefined;
  if (mint) {
    secondaryLabel = shortMintAddress(mint);
  } else if (boostMatch?.[1] && isMintLikeLabel(boostMatch[1])) {
    secondaryLabel = boostMatch[1].trim();
  }

  return {
    primaryLabel,
    secondaryLabel:
      secondaryLabel && secondaryLabel !== primaryLabel ? secondaryLabel : undefined,
    symbol,
    name,
    mint,
    isMintFallback,
  };
}

function isMarketTokenCard(item: HeatCardView): boolean {
  if (item.title.startsWith("DexScreener boost")) return true;
  const signals = item.rankingSignals ?? [];
  if (signals.includes("boost") || signals.includes("new_pair")) return true;
  if (/^New pair:/i.test(item.title)) return true;
  if (/^\$[A-Za-z0-9._-]+\s*[—–-]\s*new pair/i.test(item.title)) return true;
  return false;
}

/** Reader-first card headline for token-centric topics; falls back to metric/editorial title. */
export function buildTokenCardHeadline(
  item: HeatCardView,
  metricHeadline: string
): { headline: string; subtitle?: string } {
  if (!isMarketTokenCard(item)) {
    return { headline: metricHeadline };
  }

  const identity = resolveTokenIdentity({
    title: item.title,
    summary: item.summary,
    relatedTokens: item.relatedTokens,
    relatedProjects: item.relatedProjects,
  });

  if (item.title.startsWith("DexScreener boost")) {
    const subtitleParts = ["Promoted boost"];
    if (identity.secondaryLabel) subtitleParts.push(identity.secondaryLabel);
    return {
      headline: identity.primaryLabel,
      subtitle: subtitleParts.join(" · "),
    };
  }

  if (/^New pair:/i.test(item.title) || /new pair/i.test(item.title)) {
    const venue = item.title.match(/on\s+([A-Za-z0-9 ]+?)(?:\s*\(|$)/i)?.[1]?.trim();
    const subtitleParts: string[] = ["New pair"];
    if (venue) subtitleParts.push(`on ${venue}`);
    if (identity.secondaryLabel) subtitleParts.push(identity.secondaryLabel);
    return {
      headline: identity.primaryLabel,
      subtitle: subtitleParts.join(" · "),
    };
  }

  return {
    headline: identity.primaryLabel,
    subtitle: identity.secondaryLabel,
  };
}

export function resolvePulseTokenDisplay(row: PulseTokenRow): TokenDisplayIdentity {
  const sym = row.symbol.trim();
  const mint = row.mint.trim();
  const name = row.name?.trim();

  if (!isMintLikeLabel(sym)) {
    return {
      primaryLabel: sym.toUpperCase(),
      secondaryLabel: shortMintAddress(mint),
      symbol: sym,
      name,
      mint,
      isMintFallback: false,
    };
  }

  if (name && !isMintLikeLabel(name)) {
    return {
      primaryLabel: name,
      secondaryLabel: shortMintAddress(mint),
      symbol: sym,
      name,
      mint,
      isMintFallback: false,
    };
  }

  return {
    primaryLabel: shortMintAddress(mint),
    symbol: sym,
    name,
    mint,
    isMintFallback: true,
  };
}

export function resolveHotTapeDisplay(item: HotTapeItem): TokenDisplayIdentity {
  const pairSym = item.title.match(/^New pair:\s*([^/]+)/i)?.[1];
  const sym = item.symbol.trim();
  const mint = item.mint?.trim();
  const name = item.name?.trim();

  if (pairSym && !isMintLikeLabel(cleanSymbol(pairSym))) {
    return {
      primaryLabel: `$${cleanSymbol(pairSym)}`,
      secondaryLabel: mint ? shortMintAddress(mint) : undefined,
      symbol: cleanSymbol(pairSym),
      mint,
      isMintFallback: false,
    };
  }

  if (!isMintLikeLabel(sym)) {
    return {
      primaryLabel: sym.toUpperCase(),
      secondaryLabel: mint ? shortMintAddress(mint) : undefined,
      symbol: sym,
      mint,
      isMintFallback: false,
    };
  }

  if (mint) {
    if (name && !isMintLikeLabel(name)) {
      return {
        primaryLabel: name,
        secondaryLabel: shortMintAddress(mint),
        name,
        mint,
        isMintFallback: false,
      };
    }
    return {
      primaryLabel: shortMintAddress(mint),
      mint,
      isMintFallback: true,
    };
  }

  return {
    primaryLabel: sym || item.title.slice(0, 24),
    isMintFallback: true,
  };
}
