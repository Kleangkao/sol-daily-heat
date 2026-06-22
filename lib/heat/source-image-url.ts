const HTTP_URL = /^https?:\/\//i;

const TRACKING_URL_PATTERN =
  /(?:^|[/?])(?:1x1|pixel|spacer|tracking|track\.gif|beacon|clear\.gif|transparent\.gif)(?:[/?.]|$)/i;

const METADATA_IMAGE_KEYS = [
  "image_url",
  "imageUrl",
  "thumbnail_url",
  "thumbnailUrl",
] as const;

export function isValidSourceImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const url = value.trim();
  if (!url || !HTTP_URL.test(url)) return false;
  if (/^data:/i.test(url)) return false;
  if (TRACKING_URL_PATTERN.test(url)) return false;
  return true;
}

export function normalizeSourceImageUrl(value: unknown): string | null {
  if (!isValidSourceImageUrl(value)) return null;
  return value.trim();
}

/** Read a usable image URL from raw_items.metadata_json (supports legacy aliases). */
export function readSourceImageUrlFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  if (!metadata) return null;
  for (const key of METADATA_IMAGE_KEYS) {
    const url = normalizeSourceImageUrl(metadata[key]);
    if (url) return url;
  }
  return null;
}

type TopicSourceImageInput = {
  id: string;
  is_primary: boolean | null;
  raw_items: {
    id: string;
    metadata_json: Record<string, unknown> | null;
  } | null;
};

/** Primary source image first, else first timeline entry with an image. */
export function resolveTopicSourceImageUrl(
  topicSources: TopicSourceImageInput[],
  timeline: Array<{ id: string }>
): string | null {
  let primaryUrl: string | null = null;
  const byTimelineId = new Map<string, string>();

  for (const ts of topicSources) {
    const raw = ts.raw_items;
    if (!raw) continue;
    const url = readSourceImageUrlFromMetadata(raw.metadata_json);
    if (!url) continue;
    byTimelineId.set(raw.id, url);
    byTimelineId.set(ts.id, url);
    if (ts.is_primary) primaryUrl = url;
  }

  if (primaryUrl) return primaryUrl;

  for (const entry of timeline) {
    const url = byTimelineId.get(entry.id);
    if (url) return url;
  }

  return null;
}
