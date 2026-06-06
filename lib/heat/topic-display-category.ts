import { inferCategory } from "@/lib/process/rule-summary";
import { topicCategoryForSourceSlug } from "@/lib/sources/rss-ingest-policy";
import type { TopicCategory } from "@/lib/types/db";

/** Display category — source slug mapping first, then corrected inference for known false positives. */
export function resolveTopicDisplayCategory(input: {
  category: TopicCategory;
  sourceSlugs: string[];
  title: string;
  summary?: string;
  itemTypes?: string[];
}): TopicCategory {
  for (const slug of input.sourceSlugs) {
    const mapped = topicCategoryForSourceSlug(slug);
    if (mapped) return mapped;
  }

  const text = `${input.title} ${input.summary ?? ""}`;
  const reinferred = inferCategory(text, input.itemTypes ?? ["news"]);
  if (input.category === "ai" && reinferred !== "ai") {
    return reinferred;
  }

  return input.category;
}
