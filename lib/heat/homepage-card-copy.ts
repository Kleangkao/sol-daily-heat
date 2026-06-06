import {
  classifyReaderSignal,
  detectHomepageMetricKind,
  parseFeeMetric,
  parseTvlMetric,
  type HomepageMetricKind,
  type ReaderCopyInput,
  type ReaderSignalKind,
} from "@/lib/heat/reader-signal-copy";
import { hasOfficialSource } from "@/lib/scoring/official-sources";
import { stripEmDash } from "@/lib/heat/copy-format";
import { buildCardTeaser } from "@/lib/heat/topic-copy-layers";
import { buildHomepageMixedMetricHint } from "@/lib/heat/topic-mixed-metrics";

export type HomepageCardCopy = {
  signalLabel: string;
  brief: string;
  caution?: string;
  mixedMetricHint?: string;
};

function breakdownNum(
  b: ReaderCopyInput["scoreBreakdown"],
  key: string
): number {
  const v = b?.[key];
  return typeof v === "number" ? v : 0;
}

function largePctCaution(input: ReaderCopyInput): string | undefined {
  const fee = parseFeeMetric(input.title, input.summary);
  const smallBase = breakdownNum(input.scoreBreakdown, "fee_small_base_discount") < 0;
  if (fee?.pct != null && fee.pct > 200) {
    return "Large % move; baseline may be low. Check evidence for raw value.";
  }
  if (smallBase) {
    return "Large % move; baseline may be low. Check evidence for raw value.";
  }
  return undefined;
}

function metricPctAbs(input: ReaderCopyInput, metricKind: HomepageMetricKind): number | null {
  if (metricKind === "tvl") {
    return parseTvlMetric(input.title, input.summary)?.pct ?? null;
  }
  if (metricKind === "fee") {
    return parseFeeMetric(input.title, input.summary)?.pct ?? null;
  }
  return null;
}

function metricSignalLabel(input: ReaderCopyInput, kind: ReaderSignalKind): string {
  const metricKind =
    detectHomepageMetricKind(input) ??
    (kind === "metric_tvl" ? "tvl" : kind === "metric_fee" ? "fee" : "generic");
  const pct = metricPctAbs(input, metricKind);

  switch (metricKind) {
    case "tvl":
      if (pct != null && pct > 200) {
        return "Large TVL move · liquidity signal";
      }
      return "TVL movement · liquidity signal";
    case "volume":
      return "Volume movement · activity signal";
    case "fee":
      if (pct != null && pct > 200) {
        return "Large fee spike · single-source metric signal";
      }
      return "Fee movement · single-source metric signal";
    default:
      return "Protocol metric signal · single-source";
  }
}

function signalLabelForKind(kind: ReaderSignalKind, input: ReaderCopyInput): string {
  const multiSource = (input.sourceCount ?? 0) > 1;

  switch (kind) {
    case "metric_fee":
    case "metric_tvl":
      return metricSignalLabel(input, kind);
    case "single_editorial": {
      const slugs = input.sourceSlugs ?? [];
      if (hasOfficialSource(slugs)) return "Ecosystem update";
      return "Early ecosystem narrative";
    }
    case "multi_editorial":
      return "Cross-source ecosystem narrative";
    case "headline_only":
      return "Headline-only discovery";
    case "promoted_boost":
    case "pump_style":
      return "Market discovery only";
    case "status_incident":
      return "Operational signal";
    case "github_release":
      return "Builder / infra release";
    default:
      return multiSource ? "Multi-source scanner signal" : "Scanner signal";
  }
}

function briefForKind(kind: ReaderSignalKind, input: ReaderCopyInput): string {
  return buildCardTeaser(kind, input);
}

/** Compact reader-first preview copy for homepage cards (display only). */
export function buildHomepageCardCopy(input: ReaderCopyInput): HomepageCardCopy {
  const kind = classifyReaderSignal(input);
  const mixedMetricHint = buildHomepageMixedMetricHint(input) ?? undefined;
  const brief = briefForKind(kind, input);
  const caution = largePctCaution(input);

  return {
    signalLabel: signalLabelForKind(kind, input),
    brief: stripEmDash(brief),
    caution: caution ? stripEmDash(caution) : undefined,
    mixedMetricHint: mixedMetricHint ? stripEmDash(mixedMetricHint) : undefined,
  };
}
