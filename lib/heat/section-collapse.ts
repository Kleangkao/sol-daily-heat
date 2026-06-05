export const SECTION_OPEN_STORAGE_KEY = "sol-daily-section-open-v1";

export const DASHBOARD_SECTION_IDS = [
  "top-heat",
  "new-tokens",
  "defi",
  "builder",
  "creator",
  "investor",
] as const;

export type DashboardSectionDomId = (typeof DASHBOARD_SECTION_IDS)[number];

const DEFAULT_OPEN: Record<DashboardSectionDomId, boolean> = {
  "top-heat": true,
  "new-tokens": true,
  defi: false,
  builder: false,
  creator: false,
  investor: false,
};

export function defaultSectionOpenState(): Record<DashboardSectionDomId, boolean> {
  return { ...DEFAULT_OPEN };
}

function isSectionDomId(value: string): value is DashboardSectionDomId {
  return (DASHBOARD_SECTION_IDS as readonly string[]).includes(value);
}

export function loadSectionOpenState(): Record<DashboardSectionDomId, boolean> {
  const base = defaultSectionOpenState();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(SECTION_OPEN_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return base;
    const merged = { ...base };
    for (const id of DASHBOARD_SECTION_IDS) {
      if (typeof parsed[id] === "boolean") {
        merged[id] = parsed[id];
      }
    }
    return merged;
  } catch {
    return base;
  }
}

export function saveSectionOpenState(state: Record<DashboardSectionDomId, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SECTION_OPEN_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

export function parseSectionHash(hash: string): DashboardSectionDomId | null {
  const id = hash.replace(/^#/, "");
  return isSectionDomId(id) ? id : null;
}
