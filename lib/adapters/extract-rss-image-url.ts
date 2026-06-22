import { isValidSourceImageUrl, normalizeSourceImageUrl } from "@/lib/heat/source-image-url";
import { safeText } from "@/lib/text/normalize";

const IMAGE_MIME = /^image\//i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|$)/i;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

function urlFromUnknown(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["url", "href", "link"]) {
    const candidate = safeText(record[key]).trim();
    if (candidate) return candidate;
  }
  const attrs = record.$;
  if (attrs && typeof attrs === "object") {
    const nested = attrs as Record<string, unknown>;
    for (const key of ["url", "href"]) {
      const candidate = safeText(nested[key]).trim();
      if (candidate) return candidate;
    }
  }
  return null;
}

function looksImageLike(url: string, medium?: string, mimeType?: string): boolean {
  const type = `${mimeType ?? ""} ${medium ?? ""}`.trim();
  if (type && IMAGE_MIME.test(type)) return true;
  if (medium && /image|photo|thumbnail/i.test(medium)) return true;
  return IMAGE_EXT.test(url);
}

function isTrackingImgTag(tag: string): boolean {
  const width = tag.match(/\bwidth=["']?(\d+)/i)?.[1];
  const height = tag.match(/\bheight=["']?(\d+)/i)?.[1];
  if (width === "1" && height === "1") return true;
  return /pixel|spacer|tracking|beacon|1x1/i.test(tag);
}

function extractFirstImgSrc(html: string): string | null {
  const tagRegex = /<img\b[^>]*>/gi;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRegex.exec(html)) !== null) {
    const tag = tagMatch[0];
    if (isTrackingImgTag(tag)) continue;
    const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const url = decodeHtmlEntities(srcMatch[1].trim());
    if (isValidSourceImageUrl(url)) return url;
  }
  return null;
}

function pickFromMediaEntries(entries: unknown): string | null {
  const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
  for (const entry of list) {
    const url = urlFromUnknown(entry);
    if (!url) continue;
    const record = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const attrs =
      record.$ && typeof record.$ === "object"
        ? (record.$ as Record<string, unknown>)
        : record;
    const medium = safeText(attrs.medium) || safeText(record.medium);
    const type = safeText(attrs.type) || safeText(record.type);
    if (!looksImageLike(url, medium, type) && !IMAGE_EXT.test(url)) continue;
    const normalized = normalizeSourceImageUrl(url);
    if (normalized) return normalized;
  }
  return null;
}

function pickFromEnclosure(item: Record<string, unknown>): string | null {
  const enclosure = item.enclosure;
  const entries = Array.isArray(enclosure) ? enclosure : enclosure ? [enclosure] : [];
  for (const entry of entries) {
    const url = urlFromUnknown(entry);
    if (!url) continue;
    const record = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const type =
      safeText(record.type) ||
      safeText((record.$ as Record<string, unknown> | undefined)?.type);
    if (type && !IMAGE_MIME.test(type)) continue;
    const normalized = normalizeSourceImageUrl(url);
    if (normalized) return normalized;
  }
  return null;
}

function pickFromItunesImage(item: Record<string, unknown>): string | null {
  const candidates = [
    item.itunesImage,
    item["itunes:image"],
    (item.itunes as Record<string, unknown> | undefined)?.image,
  ];
  for (const candidate of candidates) {
    const url = urlFromUnknown(candidate);
    const normalized = url ? normalizeSourceImageUrl(url) : null;
    if (normalized) return normalized;
  }
  return null;
}

function pickFromHtmlFields(item: Record<string, unknown>): string | null {
  const htmlFields = [
    item["content:encoded"],
    item.content,
    item.summary,
    item.description,
  ];
  for (const field of htmlFields) {
    const html = safeText(field);
    if (!html || !/<img\b/i.test(html)) continue;
    const url = extractFirstImgSrc(html);
    if (url) return url;
  }
  return null;
}

/** Best-effort RSS/Atom item image URL; returns null when none found. */
export function extractRssImageUrl(item: Record<string, unknown>): string | null {
  const mediaContent =
    item.mediaContent ??
    item["media:content"] ??
    (item.mediaGroup as Record<string, unknown> | undefined)?.["media:content"] ??
    (item.mediaGroup as Record<string, unknown> | undefined)?.mediaContent;

  const fromMediaContent = pickFromMediaEntries(mediaContent);
  if (fromMediaContent) return fromMediaContent;

  const mediaThumbnail =
    item.mediaThumbnail ??
    item["media:thumbnail"] ??
    (item.mediaGroup as Record<string, unknown> | undefined)?.["media:thumbnail"] ??
    (item.mediaGroup as Record<string, unknown> | undefined)?.mediaThumbnail;

  const fromThumbnail = pickFromMediaEntries(mediaThumbnail);
  if (fromThumbnail) return fromThumbnail;

  const fromEnclosure = pickFromEnclosure(item);
  if (fromEnclosure) return fromEnclosure;

  const fromItunes = pickFromItunesImage(item);
  if (fromItunes) return fromItunes;

  return pickFromHtmlFields(item);
}
