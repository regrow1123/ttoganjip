"use client";

import { useState, useEffect, useRef } from "react";
import { useRestaurantStore } from "@/lib/store";

interface DbResult {
  id: string;
  name: string;
  address: string;
  category: string;
  source: string;
  totalVisits: number;
  placeUrl: string | null;
  inDb: true;
}

interface KakaoResult {
  placeId: string;
  name: string;
  address: string;
  category: string;
  placeUrl: string;
  inDb: false;
}

const SOURCE_LABEL: Record<string, string> = {
  assembly: "🏛️",
  seoul_expense: "🏙️",
  user: "👤",
};

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useRestaurantStore();
  const [dbResults, setDbResults] = useState<DbResult[]>([]);
  const [kakaoResults, setKakaoResults] = useState<KakaoResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // 디바운스 검색
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (searchQuery.length < 2) {
      setDbResults([]);
      setKakaoResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setDbResults(data.db || []);
        setKakaoResults(data.kakao || []);
        setShowDropdown(true);
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [searchQuery]);

  return (
    <div ref={containerRef} className="px-4 py-2 relative z-50">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
          placeholder="식당명 검색..."
          className="w-full text-sm bg-gray-100 dark:bg-tn-bg-highlight text-gray-900 dark:text-tn-fg placeholder-gray-400 dark:placeholder-tn-fg-dark rounded-lg px-3 py-2 pl-8 outline-none focus:ring-2 focus:ring-orange-500/30"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-tn-fg-dark text-xs">
          {isSearching ? "⏳" : "🔍"}
        </span>
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(""); setShowDropdown(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-tn-fg-dark text-xs hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* 검색 드롭다운 */}
      {showDropdown && (dbResults.length > 0 || kakaoResults.length > 0) && (
        <div className="absolute left-4 right-4 top-full mt-1 bg-white dark:bg-tn-bg-card border border-gray-200 dark:border-tn-border rounded-xl shadow-lg max-h-80 overflow-y-auto z-50">
          {/* DB 결과 (또간집 등록 맛집) */}
          {dbResults.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-orange-500 px-3 pt-2 pb-1">🔥 또간집 등록 맛집</p>
              {dbResults.map((r) => (
                <a
                  key={r.id}
                  href={r.placeUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-orange-50 dark:hover:bg-tn-orange/10 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-tn-fg-bright truncate">
                      {SOURCE_LABEL[r.source] || ""} {r.name}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-tn-fg-dark truncate">{r.address}</p>
                  </div>
                  <span className="text-xs font-semibold text-orange-500 flex-shrink-0">
                    🔥 {r.totalVisits}회
                  </span>
                </a>
              ))}
            </div>
          )}

          {/* 카카오 결과 (미등록) */}
          {kakaoResults.length > 0 && (
            <div className={dbResults.length > 0 ? "border-t border-gray-100 dark:border-tn-border" : ""}>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-tn-fg-dark px-3 pt-2 pb-1">📍 카카오맵 검색 결과</p>
              {kakaoResults.map((r) => (
                <a
                  key={r.placeId}
                  href={r.placeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-tn-bg-highlight transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-tn-fg truncate">{r.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-tn-fg-dark truncate">{r.address}</p>
                  </div>
                  <span className="text-[10px] text-gray-300 dark:text-tn-fg-dark flex-shrink-0">카카오맵 →</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
