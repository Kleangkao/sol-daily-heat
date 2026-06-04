/** Title heuristics for status/incident severity (no scraping). */
const SEVERE_STATUS_PATTERN =
  /\b(urgent|outage|downtime|failure|failed|degraded|incident|attack|exploit|halt|suspended|maintenance|degraded performance)\b/i;

export function isSevereStatusTitle(title: string): boolean {
  return SEVERE_STATUS_PATTERN.test(title);
}
