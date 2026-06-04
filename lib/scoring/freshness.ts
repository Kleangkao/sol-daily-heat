import { FRESH_SIGNAL_HOURS, RANKING_RAW_LOOKBACK_HOURS } from "@/lib/process/section-limits";

export { FRESH_SIGNAL_HOURS, RANKING_RAW_LOOKBACK_HOURS };

export function hoursSince(iso: string | null): number | null {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

/** Rolling freshness — not calendar midnight. */
export function isWithinHours(iso: string | null, hours: number): boolean {
  const age = hoursSince(iso);
  if (age == null) return false;
  return age <= hours;
}

export function hasFreshRawInWindow(
  timestamps: Array<string | null | undefined>,
  hours: number = FRESH_SIGNAL_HOURS
): boolean {
  return timestamps.some((t) => isWithinHours(t ?? null, hours));
}

export function isRawItemInLookback(
  fetchedAt: string,
  hours: number = RANKING_RAW_LOOKBACK_HOURS
): boolean {
  return isWithinHours(fetchedAt, hours);
}
