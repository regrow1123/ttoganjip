"use client";

import { useRestaurantStore } from "@/lib/store";
import { CATEGORIES, CATEGORY_LABELS } from "@/types";
import type { Category } from "@/types";

const CATEGORY_EMOJI: Record<Category, string> = {
  korean: "🍚",
  chinese: "🥟",
  japanese: "🍣",
  western: "🍝",
  cafe: "☕",
  bar: "🍺",
  other: "🍴",
};

export default function CategoryFilter() {
  const { categoryFilter, setCategoryFilter } = useRestaurantStore();

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
      <button
        onClick={() => setCategoryFilter(null)}
        className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
          categoryFilter === null
            ? "bg-tn-blue text-white"
            : "bg-ctp-mantle dark:bg-tn-bg-card text-ctp-subtext dark:text-tn-fg-dark hover:bg-ctp-surface0 dark:hover:bg-tn-bg-highlight"
        }`}
      >
        전체
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() =>
            setCategoryFilter(categoryFilter === cat ? null : cat)
          }
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
            categoryFilter === cat
              ? "bg-tn-blue text-white"
              : "bg-ctp-mantle dark:bg-tn-bg-card text-ctp-subtext dark:text-tn-fg-dark hover:bg-ctp-surface0 dark:hover:bg-tn-bg-highlight"
          }`}
        >
          {CATEGORY_EMOJI[cat]} {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}
