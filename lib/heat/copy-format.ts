/** Replace em/en dashes in reader-facing copy with plain punctuation. */
export function stripEmDash(text: string): string {
  return text
    .replace(/\s*—\s*/g, ". ")
    .replace(/\s*–\s*/g, ", ")
    .replace(/\.\s+\./g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

/** Homepage card excerpt length (display only). */
export const CARD_EXCERPT_MAX = 168;

/** Topic detail source brief excerpt length (display only). */
export const DETAIL_EXCERPT_MAX = 480;

/** Short card excerpt without mid-word cuts. */
export function excerptForCard(text: string, maxLen = 160): string {
  const cleaned = stripEmDash(text);
  if (cleaned.length <= maxLen) return cleaned;
  const slice = cleaned.slice(0, maxLen);
  const cut = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf(", "),
    slice.lastIndexOf(" ")
  );
  const end = cut > maxLen * 0.55 ? cut : maxLen;
  return `${slice.slice(0, end).trim()}…`;
}

/** Detail-page source brief — same boundary rules as cards, longer cap. */
export function excerptForDetail(text: string, maxLen = DETAIL_EXCERPT_MAX): string {
  return excerptForCard(text, maxLen);
}
