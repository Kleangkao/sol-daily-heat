import {
  classifyReaderSignal,
  detectHomepageMetricKind,
  parseFeeMetric,
  parseTvlMetric,
  type HomepageMetricKind,
  type ReaderCopyInput,
  type ReaderSignalKind,
} from "@/lib/heat/reader-signal-copy";
import { excerptForCard, stripEmDash } from "@/lib/heat/copy-format";
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

function extractFeeAmount(...texts: Array<string | undefined>): string | null {
  for (const text of texts) {
    if (!text) continue;
    const patterns = [
      /24h fees\s*~?\s*\$?([\d,.]+[KMB]?)/i,
      /fees\s*~?\s*\$?([\d,.]+[KMB]?)/i,
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m) return m[1].replace(/^\$/, "");
    }
  }
  return null;
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
    case "single_editorial":
      return "Early ecosystem narrative";
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
  const fee = parseFeeMetric(input.title, input.summary);
  const tvl = parseTvlMetric(input.title, input.summary);
  const amount = extractFeeAmount(input.summary, input.title);
  const name = input.title.split(":")[0]?.trim() || "This protocol";
  const stored = input.summary?.trim();
  const metricKind = detectHomepageMetricKind(input);

  switch (kind) {
    case "metric_fee": {
      if (metricKind === "tvl" || tvl) {
        return `${name} registered a notable TVL move in the last 24h. Check evidence for underlying protocol values before treating it as a durable trend.`;
      }
      if (metricKind === "volume") {
        return `${name} registered a notable volume move in the last 24h. Verify raw evidence before treating it as sustained activity.`;
      }
      if (fee?.protocol && amount) {
        const dir = fee.direction === "up" ? "rose" : "fell";
        const baseline =
          fee.pct > 200
            ? " Previous baseline appears low, so verify the raw evidence before treating this as sustained momentum."
            : " Verify the raw evidence before treating this as sustained momentum.";
        return `${fee.protocol} 24h fees ${dir} to about $${amount}.${baseline}`;
      }
      return `${name} registered a sharp 24h fee move. Verify raw evidence before treating it as sustained momentum.`;
    }
    case "metric_tvl": {
      if (tvl && input.summary?.includes("TVL ~")) {
        const tvlAmt = input.summary.match(/TVL\s*~?\s*\$?([\d,.]+[KMB]?)/i)?.[1];
        if (tvlAmt) {
          const verb = tvl.direction === "up" ? "rose to" : "fell to";
          return `${name} 24h TVL ${verb} about $${tvlAmt}. Check evidence for underlying protocol values before treating it as a durable trend.`;
        }
      }
      return `${name} registered a notable TVL move in the last 24h. Check evidence for underlying protocol values before treating it as a durable trend.`;
    }
    case "single_editorial":
      if (stored && stored.length > 40 && !/adapter signal|fees move/i.test(stored)) {
        return `${excerptForCard(stored)} Watch for follow-up coverage or on-chain evidence.`;
      }
      return "Primary-source or editorial coverage matched the scanner. Watch for follow-up coverage or on-chain evidence.";
    case "multi_editorial":
      if (stored && stored.length > 40 && !/adapter signal/i.test(stored)) {
        return `${excerptForCard(stored)} Multiple sources covered the same story today.`;
      }
      return "Multiple sources covered the same Solana-related story, making it more likely to be worth tracking.";
    case "headline_only":
      return "SolanaFloor headline discovery only. Full article text was not ingested. Open the source link before relying on this summary.";
    case "promoted_boost": {
      const token = input.title.replace(/^DexScreener boost:\s*/i, "").trim();
      return `This token (${token || "mint"}) appeared through paid DexScreener visibility. Promotion increases discoverability, not fundamental validation.`;
    }
    case "pump_style": {
      const token = input.title.replace(/^DexScreener boost:\s*/i, "").trim();
      return `Early visibility on a pump-style or thin-liquidity mint (${token || "mint"}). High risk. Not validation.`;
    }
    case "status_incident":
      return stored && stored.length > 20
        ? `${stored.slice(0, 220)} Confirm current status on the official page.`
        : "Status-source activity suggests a service or infrastructure issue worth monitoring.";
    case "github_release":
      return "A client or infrastructure release was detected. Builders should check compatibility, release notes, and downstream impact.";
    default:
      if (stored && stored.length > 30 && !/^Clustered from|adapter signal/i.test(stored)) {
        return excerptForCard(stored, 200);
      }
      return "Clustered Solana signals surfaced this topic in today's UTC snapshot.";
  }
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
