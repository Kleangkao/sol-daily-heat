"use client";

import type { HeatCategoryFilter } from "@/lib/types/heat";
import { CATEGORY_LABELS } from "@/lib/types/heat";
import type { TopicCategory } from "@/lib/types/db";

const FILTERS: HeatCategoryFilter[] = [
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

type Props = {
  value: HeatCategoryFilter;
  onChange: (value: HeatCategoryFilter) => void;
};

export default function CategoryFilter({ value, onChange }: Props) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Categories — filters Top Heat only"
    >
      {FILTERS.map((cat) => {
        const active = value === cat;
        const label = cat === "all" ? "All" : CATEGORY_LABELS[cat as TopicCategory];
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
              active
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-bg-secondary text-text-secondary hover:border-accent/50 hover:text-text-primary"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
