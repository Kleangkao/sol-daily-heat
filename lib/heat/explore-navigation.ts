import type { DashboardSectionDomId } from "@/lib/heat/section-collapse";
import { CATEGORY_LABELS } from "@/lib/types/heat";
import type { TopicCategory } from "@/lib/types/db";
import {
  AI_DEMO_SECTION,
  GAMING_DEMO_SECTION,
  NFT_DEMO_SECTION,
} from "@/lib/demo/spotlight-sections";
import {
  CREATOR_SPACE,
  HOT_ON_SOLANA,
  NEW_AND_TRENDING,
} from "@/lib/product/copy";

/** Category lenses for Top Heat — mock/demo topics use static sections instead. */
export const TOP_HEAT_CATEGORY_LENSES: TopicCategory[] = [
  "defi",
  "meme",
  "infra",
  "regulatory",
];

/** Explore chips that scroll to static demo sections (not Top Heat filters). */
export const DEMO_TOPIC_SECTION_IDS = {
  gaming: GAMING_DEMO_SECTION.id,
  nft: NFT_DEMO_SECTION.id,
  ai: AI_DEMO_SECTION.id,
} as const;

export type DemoTopicExploreChipId = keyof typeof DEMO_TOPIC_SECTION_IDS;

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
    }
  | {
      type: "demo-section";
      sectionId: string;
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

/** Hidden from the Explore bar row for now; homepage sections not rendered. */
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
    case "regulatory":
      return {
        type: "category-lens",
        category: id,
        openSections: ["top-heat"],
        scrollTo: "top-heat",
      };
    case "gaming":
      return { type: "demo-section", sectionId: DEMO_TOPIC_SECTION_IDS.gaming };
    case "nft":
      return { type: "demo-section", sectionId: DEMO_TOPIC_SECTION_IDS.nft };
    case "ai":
      return { type: "demo-section", sectionId: DEMO_TOPIC_SECTION_IDS.ai };
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

function demoChipFromHash(hash: string): DemoTopicExploreChipId | null {
  const id = hash.replace(/^#/, "");
  for (const [chip, sectionId] of Object.entries(DEMO_TOPIC_SECTION_IDS)) {
    if (id === sectionId) return chip as DemoTopicExploreChipId;
  }
  return null;
}

/** Derive highlighted chip from URL category + location hash. */
export function deriveActiveExploreChip(
  categoryFilter: TopicCategory | null,
  sectionHash: DashboardSectionDomId | null,
  locationHash = ""
): ExploreChipId {
  const demoChip = demoChipFromHash(locationHash);
  if (demoChip) return demoChip;
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

/** Homepage section ids observed for ExploreBar scroll highlighting. */
export const EXPLORE_SCROLL_SECTION_IDS = [
  "top-heat",
  "new-tokens",
  "defi",
  DEMO_TOPIC_SECTION_IDS.gaming,
  DEMO_TOPIC_SECTION_IDS.nft,
  DEMO_TOPIC_SECTION_IDS.ai,
  "investor",
] as const;

/** Map a visible section element id to the ExploreBar chip that should highlight. */
export function exploreChipForSectionElementId(
  sectionId: string,
  categoryFilter: TopicCategory | null
): ExploreChipId | null {
  if (sectionId === "top-heat") {
    if (categoryFilter && TOP_HEAT_CATEGORY_LENSES.includes(categoryFilter)) {
      return categoryFilter as ExploreChipId;
    }
    return "top-heat";
  }
  if (sectionId === "new-tokens") return "new-tokens";
  if (sectionId === "defi") return "defi";
  if (sectionId === "investor") return "investor";
  for (const [chip, demoId] of Object.entries(DEMO_TOPIC_SECTION_IDS)) {
    if (sectionId === demoId) return chip as ExploreChipId;
  }
  return null;
}
