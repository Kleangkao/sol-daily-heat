import type { DashboardSectionDomId } from "@/lib/heat/section-collapse";
import { CATEGORY_LABELS } from "@/lib/types/heat";
import type { TopicCategory } from "@/lib/types/db";
import {
  CREATOR_SPACE,
  HOT_ON_SOLANA,
  NEW_AND_TRENDING,
} from "@/lib/product/copy";

/** Category lenses in the unified Explore bar (no Ecosystem — Top Heat shows all). */
export const TOP_HEAT_CATEGORY_LENSES: TopicCategory[] = [
  "defi",
  "meme",
  "infra",
  "gaming",
  "nft",
  "ai",
  "regulatory",
];

export type ExploreChipId =
  | "top-heat"
  | "new-tokens"
  | "defi"
  | "meme"
  | "infra"
  | "gaming"
  | "nft"
  | "ai"
  | "regulatory"
  | "builder"
  | "creator"
  | "investor";

export type ExploreChipAction =
  | {
      type: "clear-category";
      openSections: ["top-heat"];
      scrollTo: "top-heat";
    }
  | {
      type: "section-only";
      section: DashboardSectionDomId;
    }
  | {
      type: "category-lens";
      category: TopicCategory;
      openSections: ["top-heat"];
      scrollTo: "top-heat";
    }
  | {
      type: "defi-hybrid";
      category: "defi";
      openSections: ["top-heat", "defi"];
      scrollTo: "top-heat";
    };

export const EXPLORE_CHIPS: { id: ExploreChipId; label: string }[] = [
  { id: "top-heat", label: HOT_ON_SOLANA.exploreLabel },
  { id: "new-tokens", label: NEW_AND_TRENDING.exploreLabel },
  { id: "defi", label: CATEGORY_LABELS.defi },
  { id: "meme", label: CATEGORY_LABELS.meme },
  { id: "infra", label: CATEGORY_LABELS.infra },
  { id: "gaming", label: CATEGORY_LABELS.gaming },
  { id: "nft", label: CATEGORY_LABELS.nft },
  { id: "ai", label: CATEGORY_LABELS.ai },
  { id: "regulatory", label: CATEGORY_LABELS.regulatory },
  { id: "builder", label: "Builder" },
  { id: "creator", label: CREATOR_SPACE.exploreLabel },
  { id: "investor", label: "Investor" },
];

/** Hidden from the Explore bar row for now; sections remain reachable via scroll/hash. */
const HIDDEN_EXPLORE_BAR_CHIPS = new Set<ExploreChipId>(["builder", "creator"]);

export const EXPLORE_BAR_CHIPS = EXPLORE_CHIPS.filter(
  (chip) => !HIDDEN_EXPLORE_BAR_CHIPS.has(chip.id),
);

export function resolveExploreChipAction(id: ExploreChipId): ExploreChipAction {
  switch (id) {
    case "top-heat":
      return {
        type: "clear-category",
        openSections: ["top-heat"],
        scrollTo: "top-heat",
      };
    case "new-tokens":
      return { type: "section-only", section: "new-tokens" };
    case "defi":
      return {
        type: "defi-hybrid",
        category: "defi",
        openSections: ["top-heat", "defi"],
        scrollTo: "top-heat",
      };
    case "meme":
    case "infra":
    case "gaming":
    case "nft":
    case "ai":
    case "regulatory":
      return {
        type: "category-lens",
        category: id,
        openSections: ["top-heat"],
        scrollTo: "top-heat",
      };
    case "builder":
      return { type: "section-only", section: "builder" };
    case "creator":
      return { type: "section-only", section: "creator" };
    case "investor":
      return { type: "section-only", section: "investor" };
  }
}

const SECTION_ONLY_EXPLORE_CHIPS: ExploreChipId[] = [
  "new-tokens",
  "builder",
  "creator",
  "investor",
];

/** Derive highlighted chip from URL category + section hash. */
export function deriveActiveExploreChip(
  categoryFilter: TopicCategory | null,
  sectionHash: DashboardSectionDomId | null
): ExploreChipId {
  if (
    sectionHash &&
    (SECTION_ONLY_EXPLORE_CHIPS as readonly string[]).includes(sectionHash)
  ) {
    return sectionHash;
  }
  if (categoryFilter) {
    return categoryFilter as ExploreChipId;
  }
  if (sectionHash === "defi") return "defi";
  return "top-heat";
}
