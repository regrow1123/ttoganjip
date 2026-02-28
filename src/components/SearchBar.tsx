"use client";

import { useRestaurantStore } from "@/lib/store";

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useRestaurantStore();

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex-1 relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="식당명, 지역 검색..."
          className="w-full text-sm bg-gray-100 dark:bg-tn-bg-highlight text-gray-900 dark:text-tn-fg placeholder-gray-400 dark:placeholder-tn-fg-dark rounded-lg px-3 py-2 pl-8 outline-none focus:ring-2 focus:ring-orange-500/30"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-tn-fg-dark text-xs">🔍</span>
        {searchQuery && (
    </div>
  );
}
