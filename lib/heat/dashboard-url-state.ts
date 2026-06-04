import type { HeatCategoryFilter } from "@/lib/types/heat";

const VALID_CATEGORIES: HeatCategoryFilter[] = [
  "all",
  "ecosystem",
  "defi",
  "meme",
  "infra",
  "gaming",
  "nft",
  "ai",
  "regulatory",
  "other",
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseCategoryParam(raw: string | null): HeatCategoryFilter {
  if (!raw) return "all";
  if (VALID_CATEGORIES.includes(raw as HeatCategoryFilter)) {
    return raw as HeatCategoryFilter;
  }
  return "all";
}

/** Returns undefined when param missing/invalid; otherwise a date in availableDates or latest. */
export function resolveDateParam(
  raw: string | null,
  availableDates: string[]
): string | undefined {
  if (!raw || !DATE_RE.test(raw)) return undefined;
  if (availableDates.length === 0) return raw;
  if (availableDates.includes(raw)) return raw;
  return availableDates[0];
}

export function isValidDateParam(raw: string | null): boolean {
  return Boolean(raw && DATE_RE.test(raw));
}

export function buildDashboardQueryString(
  date: string | undefined,
  category: HeatCategoryFilter
): string {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (category !== "all") params.set("category", category);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
