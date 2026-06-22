import type { TopicCategory } from "@/lib/types/db";
import { CATEGORY_LABELS } from "@/lib/types/heat";

/** Visible homepage topic tag label with fire accent. */
export function categoryTopicTagLabel(category: TopicCategory): string {
  return `${CATEGORY_LABELS[category]} 🔥`;
}
