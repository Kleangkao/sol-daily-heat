/** UTC calendar date for daily_rankings snapshots (YYYY-MM-DD). */
export function utcTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function utcAvailableDates(days = 7): string[] {
  const dates: string[] = [];
  const base = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Dropdown label — always UTC, never implied local "today". */
export function formatSnapshotDateOption(iso: string): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  const formatted = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  if (iso === utcTodayIso()) {
    return `${formatted} · latest UTC snapshot`;
  }
  return `${formatted} · ${iso}`;
}

export function formatSnapshotHeroLine(iso: string): string {
  return `Snapshot: ${iso} UTC`;
}
