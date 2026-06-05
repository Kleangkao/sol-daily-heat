import {
  classifyReaderSignal,
  parseFeeMetric,
  type ReaderCopyInput,
  type ReaderSignalKind,
} from "@/lib/heat/reader-signal-copy";

export type HomepageCardCopy = {
  signalLabel: string;
  brief: string;
  caution?: string;
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

function signalLabelForKind(kind: ReaderSignalKind, input: ReaderCopyInput): string {
  const fee = parseFeeMetric(input.title, input.summary);
  const multiSource = (input.sourceCount ?? 0) > 1;

  switch (kind) {
    case "metric_fee":
      if (fee && fee.pct > 200) {
        return "Large fee spike · single-source metric signal";
      }
      return "Fee spike · single-source metric signal";
    case "metric_tvl":
      return "TVL move · single-source metric signal";
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
  const amount = extractFeeAmount(input.summary, input.title);
  const name = input.title.split(":")[0]?.trim() || "This protocol";
  const stored = input.summary?.trim();

  switch (kind) {
    case "metric_fee": {
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
    case "metric_tvl":
      return `${name} registered a notable TVL move in the last 24h. Check evidence for underlying protocol values before treating it as a durable trend.`;
    case "single_editorial":
      if (stored && stored.length > 40 && !/adapter signal|fees move/i.test(stored)) {
        return `${stored.slice(0, 200)} Watch for follow-up coverage or on-chain evidence.`;
      }
      return "Primary-source or editorial coverage matched the scanner. Watch for follow-up coverage or on-chain evidence.";
    case "multi_editorial":
      if (stored && stored.length > 40 && !/adapter signal/i.test(stored)) {
        return `${stored.slice(0, 200)} Multiple sources covered the same story today.`;
      }
      return "Multiple sources covered the same Solana-related story, making it more likely to be worth tracking.";
    case "headline_only":
      return `SolanaFloor headline discovery only — full article text was not ingested. Open the source link before relying on this summary.`;
    case "promoted_boost": {
      const token = input.title.replace(/^DexScreener boost:\s*/i, "").trim();
      return `This token (${token || "mint"}) appeared through paid DexScreener visibility. Promotion increases discoverability, not fundamental validation.`;
    }
    case "pump_style": {
      const token = input.title.replace(/^DexScreener boost:\s*/i, "").trim();
      return `Early visibility on a pump-style or thin-liquidity mint (${token || "mint"}). High risk — not validation.`;
    }
    case "status_incident":
      return stored && stored.length > 20
        ? `${stored.slice(0, 220)} Confirm current status on the official page.`
        : "Status-source activity suggests a service or infrastructure issue worth monitoring.";
    case "github_release":
      return "A client or infrastructure release was detected. Builders should check compatibility, release notes, and downstream impact.";
    default:
      if (stored && stored.length > 30 && !/^Clustered from|adapter signal/i.test(stored)) {
        return stored.slice(0, 220);
      }
      return "Clustered Solana signals surfaced this topic in today's UTC snapshot.";
  }
}

/** Compact reader-first preview copy for homepage cards (display only). */
export function buildHomepageCardCopy(input: ReaderCopyInput): HomepageCardCopy {
  const kind = classifyReaderSignal(input);
  return {
    signalLabel: signalLabelForKind(kind, input),
    brief: briefForKind(kind, input),
    caution: largePctCaution(input),
  };
}
