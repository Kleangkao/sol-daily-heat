import type { ScoreBreakdown } from "@/lib/types/db";
import { hasOfficialSource } from "@/lib/scoring/official-sources";

function breakdownNum(
  b: ScoreBreakdown | Record<string, number> | undefined,
  key: string
): number {
  const v = b?.[key];
  return typeof v === "number" ? v : 0;
}

export type HeatDriverInput = {
  scoreBreakdown?: ScoreBreakdown | Record<string, number>;
  sourceSlugs?: string[];
  category?: string;
  uniqueSourceCount?: number;
};

/** Short reader-facing summary of why heat landed where it did (display only). */
export function buildHeatDrivers(input: HeatDriverInput): string {
  const b = input.scoreBreakdown ?? {};
  const drivers: string[] = [];

  const hasOfficial =
    breakdownNum(b, "official_source_bonus") > 0 || hasOfficialSource(input.sourceSlugs ?? []);

  if (hasOfficial) drivers.push("official source");
  if (breakdownNum(b, "editorial_confirmation") > 0) {
    drivers.push("multi-source");
  } else if ((input.uniqueSourceCount ?? 0) <= 1) {
    drivers.push("single source");
  }
  if (breakdownNum(b, "recency") > 0) drivers.push("fresh");
  if (breakdownNum(b, "novelty") > 0) drivers.push("new today");
  if (breakdownNum(b, "volume_signal") > 0) drivers.push("market activity");
  if (breakdownNum(b, "cross_type_corroboration") > 0) drivers.push("cross-type match");
  if (
    !hasOfficial &&
    breakdownNum(b, "reliability_weight") > 0
  ) {
    drivers.push("trusted source");
  }
  if (breakdownNum(b, "keyword_match") > 0) drivers.push("Solana keywords");
  else if (input.category === "defi") drivers.push("DeFi category");

  const unique = Array.from(new Set(drivers));
  if (unique.length === 0) {
    return "Heat drivers: clustered signals.";
  }

  return `Heat drivers: ${unique.slice(0, 3).join(", ")}.`;
}
