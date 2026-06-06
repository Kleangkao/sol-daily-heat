/** Replace em/en dashes in reader-facing copy with plain punctuation. */
export function stripEmDash(text: string): string {
  return text
    .replace(/\s*—\s*/g, ". ")
    .replace(/\s*–\s*/g, ", ")
    .replace(/\.\s+\./g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

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
