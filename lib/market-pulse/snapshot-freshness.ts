import { PULSE_STALE_MINUTES } from "@/lib/market-pulse/constants";

export type SnapshotFreshness = {
  stale: boolean;
  headline: string;
  detail: string;
};

function formatFetchedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** User-facing copy for stored Market Pulse snapshots on token detail (no live fetch). */
export function snapshotFreshnessFromFetchedAt(fetchedAt: string): SnapshotFreshness {
  const fetchedMs = new Date(fetchedAt).getTime();
  const ageMs = Date.now() - fetchedMs;
  const stale = ageMs > PULSE_STALE_MINUTES * 60_000;
  const at = formatFetchedAt(fetchedAt);

  if (stale) {
    return {
      stale: true,
      headline: "Price snapshot may be stale.",
      detail: `Last stored ${at} · refresh runs on the Market Pulse schedule`,
    };
  }

  return {
    stale: false,
    headline: `Snapshot updated ${at}`,
    detail: "Stored market context from Market Pulse — not a live quote",
  };
}
