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
              ? "bg-orange-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          {SOURCE_LABELS[s]}
        </button>
      ))}
    </div>
  );
}
