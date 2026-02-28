"use client";

import { useRestaurantStore } from "@/lib/store";
import { SOURCES, SOURCE_LABELS, type Source } from "@/types";

export default function SourceTabs() {
  const { sourceFilter, setSourceFilter } = useRestaurantStore();

  return (
    <div className="flex gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide">
      {SOURCES.map((s) => (
        <button
          key={s}
          onClick={() => setSourceFilter(s)}
          className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
            sourceFilter === s
              ? "bg-tn-blue text-white"
              : "bg-ctp-mantle dark:bg-tn-bg-card text-ctp-subtext dark:text-tn-fg-dark hover:bg-ctp-surface0 dark:hover:bg-tn-bg-highlight"
          }`}
        >
          {SOURCE_LABELS[s]}
        </button>
      ))}
    </div>
  );
}
