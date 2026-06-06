import type { RawItem, Source } from "@/lib/types/db";

export type StoryTimeKind = "published" | "reported" | "metric_window";

export type StoryTimestamp = {
  iso: string;
  kind: StoryTimeKind;
  sourceSlug?: string;
};

export type StorySourceInput = {
  publishedAt?: string | null;
  fetchedAt?: string | null;
  reliability?: number | null;
  itemType?: string | null;
  signal?: string | null;
};

const METRIC_SIGNALS = new Set([
  "chain_fees",
  "fees_move",
  "tvl_move",
  "chain_tvl",
]);

/** DeFiLlama 24h metrics roll up to the current UTC day boundary. */
export function utcMetricDayStartIso(ref = new Date()): string {
  return new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate())
  ).toISOString();
}

function sourceInstant(input: StorySourceInput): number {
  const iso = input.publishedAt ?? input.fetchedAt;
  return iso ? new Date(iso).getTime() : 0;
}

export function resolveStoryTimeKind(
  itemTypes: string[],
  signals: string[] = []
): StoryTimeKind {
  if (itemTypes.some((t) => t === "news" || t === "manual")) {
    return "published";
  }

  if (signals.includes("boost")) return "reported";
  if (signals.includes("new_pair")) return "published";

  const metricOnly =
    itemTypes.length > 0 &&
    itemTypes.every((t) => t === "protocol" || t === "market") &&
    (signals.length === 0 ||
      signals.every((s) => METRIC_SIGNALS.has(s) || s === "new_pair"));

  if (metricOnly) return "metric_window";
  return "reported";
}

export function storyTimePrefix(kind: StoryTimeKind): string {
  switch (kind) {
    case "published":
      return "Published";
    case "reported":
      return "Reported";
    case "metric_window":
      return "Updated";
  }
}

export function formatStoryRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (hours < 48) return `${hours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatStoryTimestampLine(kind: StoryTimeKind, iso: string): string {
  const relative = formatStoryRelative(iso);
  if (kind === "metric_window") {
    return `${storyTimePrefix(kind)} ${relative}`;
  }
  return `${storyTimePrefix(kind)} ${relative}`;
}

export function pickPrimaryRawItem(
  items: Array<RawItem & { sources?: Source }>
): (RawItem & { sources?: Source }) | undefined {
  if (items.length === 0) return undefined;
  return [...items].sort((a, b) => {
    const relA = a.sources?.reliability ?? 0.5;
    const relB = b.sources?.reliability ?? 0.5;
    if (relB !== relA) return relB - relA;

    const ta = new Date(a.published_at ?? a.fetched_at).getTime();
    const tb = new Date(b.published_at ?? b.fetched_at).getTime();
    return tb - ta;
  })[0];
}

export function primarySourceSlug(
  items: Array<RawItem & { sources?: Source }>
): string {
  const counts = new Map<string, number>();
  let bestSlug = "unknown";
  let bestRel = -1;
  let bestCount = 0;

  for (const item of items) {
    const slug = item.sources?.slug ?? item.source_id;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
    const rel = item.sources?.reliability ?? 0.5;
    const count = counts.get(slug) ?? 0;
    if (rel > bestRel || (rel === bestRel && count > bestCount)) {
      bestRel = rel;
      bestCount = count;
      bestSlug = slug;
    }
  }

  return bestSlug;
}

function signalsFromItems(
  items: Array<RawItem & { sources?: Source }>
): string[] {
  const signals = new Set<string>();
  for (const item of items) {
    const signal = item.metadata_json?.signal;
    if (typeof signal === "string") signals.add(signal);
  }
  return Array.from(signals);
}

export function pickStoryTimestampFromItems(
  items: Array<RawItem & { sources?: Source }>,
  itemTypes: string[],
  fallbackIso?: string
): StoryTimestamp {
  const primary = pickPrimaryRawItem(items);
  const signals = signalsFromItems(items);
  const kind = resolveStoryTimeKind(itemTypes, signals);

  const iso =
    primary?.published_at ??
    primary?.fetched_at ??
    fallbackIso ??
    new Date().toISOString();

  return {
    iso,
    kind,
    sourceSlug: primary?.sources?.slug,
  };
}

export function pickStoryTimestampFromSources(
  sources: StorySourceInput[],
  itemTypes: string[],
  signals: string[] = [],
  fallbackIso?: string
): StoryTimestamp {
  if (sources.length === 0) {
    return {
      iso: fallbackIso ?? new Date().toISOString(),
      kind: resolveStoryTimeKind(itemTypes, signals),
    };
  }

  const primary = [...sources].sort((a, b) => {
    const relA = a.reliability ?? 0.5;
    const relB = b.reliability ?? 0.5;
    if (relB !== relA) return relB - relA;
    return sourceInstant(b) - sourceInstant(a);
  })[0];

  const iso =
    primary.publishedAt ?? primary.fetchedAt ?? fallbackIso ?? new Date().toISOString();

  return {
    iso,
    kind: resolveStoryTimeKind(itemTypes, signals),
  };
}

export function readStoredStoryAt(meta: Record<string, unknown>): string | undefined {
  return typeof meta.story_at === "string" ? meta.story_at : undefined;
}

export function readStoredStoryTimeKind(
  meta: Record<string, unknown>
): StoryTimeKind | undefined {
  const raw = meta.story_time_kind;
  if (raw === "published" || raw === "reported" || raw === "metric_window") {
    return raw;
  }
  return undefined;
}
