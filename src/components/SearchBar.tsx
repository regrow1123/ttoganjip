"use client";

import { useEffect, useRef } from "react";
import { useRestaurantStore, useMapStore } from "@/lib/store";

export default function SearchBar() {
  const { searchQuery, setSearchQuery, setSearchResults, setIsSearching, isSearching } = useRestaurantStore();
  const { bounds } = useMapStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (searchQuery.length < 2) {
      setSearchResults([], []);
      return;
    }

    setIsSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        let url = `/api/search?q=${encodeURIComponent(searchQuery)}`;
        if (bounds) {
          url += `&swLat=${bounds.sw.lat}&swLng=${bounds.sw.lng}&neLat=${bounds.ne.lat}&neLng=${bounds.ne.lng}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setSearchResults(data.db || [], data.kakao || []);
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [searchQuery, bounds, setSearchResults, setIsSearching]);

  return (
    <div className="px-4 py-2">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="식당명 검색..."
          className="w-full text-sm bg-gray-100 dark:bg-tn-bg-highlight text-gray-900 dark:text-tn-fg placeholder-gray-400 dark:placeholder-tn-fg-dark rounded-lg px-3 py-2 pl-8 outline-none focus:ring-2 focus:ring-tn-blue/30"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-tn-fg-dark text-xs">
          {isSearching ? "⏳" : "🔍"}
        </span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-tn-fg-dark text-xs hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
