import { excerptForCard, stripEmDash } from "@/lib/heat/copy-format";
import {
  classifyReaderSignal,
  detectHomepageMetricKind,
  parseFeeMetric,
  parseTvlMetric,
  type ReaderCopyInput,
  type ReaderSignalKind,
} from "@/lib/heat/reader-signal-copy";
import type { EvidenceItem } from "@/lib/types/evidence";
import { buildSourceCardExcerpt } from "@/lib/heat/source-presented-copy";

/** Normalize for overlap checks between card / brief / evidence layers. */
export function normalizeCopyText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function textsOverlap(a: string, b: string): boolean {
  const na = normalizeCopyText(a);
  const nb = normalizeCopyText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length > nb.length ? na : nb;
  if (shorter.length >= 48 && longer.includes(shorter)) return true;
  return false;
}

export function textsOverlapAny(text: string, others: string[]): boolean {
  return others.some((o) => textsOverlap(text, o));
}

function titleHook(input: ReaderCopyInput, maxLen = 72): string {
  const title = input.title.trim();
  return title.length <= maxLen ? title : excerptForCard(title, maxLen);
}

function extractFeeAmount(...texts: Array<string | undefined>): string | null {
  for (const text of texts) {
    if (!text) continue;
    const m = text.match(/24h fees\s*~?\s*\$?([\d,.]+[KMB]?)/i) ?? text.match(/fees\s*~?\s*\$?([\d,.]+[KMB]?)/i);
    if (m) return m[1].replace(/^\$/, "");
  }
  return null;
}

/**
 * Layer 1 — Homepage card teaser. Must not copy detail brief or raw summary verbatim.
 */
export function buildCardTeaser(kind: ReaderSignalKind, input: ReaderCopyInput): string {
  const name = input.title.split(":")[0]?.trim() || "This protocol";
  const fee = parseFeeMetric(input.title, input.summary);
  const tvl = parseTvlMetric(input.title, input.summary);
  const amount = extractFeeAmount(input.summary, input.title);
  const metricKind = detectHomepageMetricKind(input);
  const hook = titleHook(input);

  switch (kind) {
    case "metric_fee": {
      if (metricKind === "tvl" || tvl) {
        return `${name} TVL moved in the latest snapshot. Open for metric evidence.`;
      }
      if (fee?.protocol && amount) {
        const dir = fee.direction === "up" ? "up" : "down";
        return `${fee.protocol} 24h fees ${dir} (~$${amount}). Metric signal only.`;
      }
      return `${name} fee activity crossed the scanner threshold. Open for sourced values.`;
    }
    case "metric_tvl":
      return `${name} TVL moved in the latest snapshot. Open for metric evidence.`;
    case "single_editorial": {
      const excerpt = buildSourceCardExcerpt(input);
      if (excerpt) return excerpt;
      return `${hook}`;
    }
    case "multi_editorial": {
      const excerpt = buildSourceCardExcerpt(input);
      if (excerpt) return excerpt;
      return `${hook}`;
    }
    case "headline_only":
      return `Headline-only discovery: ${hook}. Full article not ingested.`;
    case "promoted_boost": {
      const token = input.title.replace(/^DexScreener boost:\s*/i, "").trim();
      return `Paid visibility on ${token || "this mint"}. Market discovery, not validation.`;
    }
    case "pump_style": {
      const token = input.title.replace(/^DexScreener boost:\s*/i, "").trim();
      return `Thin-liquidity mint surfaced: ${token || "mint"}. High risk.`;
    }
    case "status_incident":
      return `Status feed activity on ${hook}. Open for official status link.`;
    case "github_release": {
      const excerpt = buildSourceCardExcerpt(input);
      return excerpt ?? `${hook}`;
    }
    default:
      return `Scanner clustered: ${hook}. Open for brief and evidence.`;
  }
}

/**
 * Layer 3 — Evidence excerpt. Source proof only; must not repeat card teaser or brief paragraphs.
 */
export function buildEvidenceExcerpt(
  item: EvidenceItem,
  avoidTexts: string[]
): string | null {
  let text = item.text.trim();
  if (!text) return null;

  if (textsOverlapAny(text, avoidTexts)) {
    return null;
  }

  const max =
    item.kind === "protocol_signal" || item.kind === "market_signal" ? 200 : 240;
  return text.length > max ? excerptForCard(text, max) : text;
}

export function buildCardTeaserFromInput(input: ReaderCopyInput): string {
  const kind = classifyReaderSignal(input);
  return stripEmDash(buildCardTeaser(kind, input));
}
