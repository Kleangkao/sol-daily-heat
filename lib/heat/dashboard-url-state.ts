import { TOP_HEAT_CATEGORY_LENSES } from "@/lib/heat/explore-navigation";
import type { TopicCategory } from "@/lib/types/db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** No ?category= means Top Heat shows all topics (Top Heat chip active). */
export function parseCategoryParam(raw: string | null): TopicCategory | null {
  if (!raw || raw === "all" || raw === "ecosystem") return null;
  if (TOP_HEAT_CATEGORY_LENSES.includes(raw as TopicCategory)) {
    return raw as TopicCategory;
  }
  return null;
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
  category: TopicCategory | null
): string {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (category) params.set("category", category);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
