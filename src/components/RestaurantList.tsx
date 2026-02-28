"use client";

import { useState, useEffect } from "react";
import { useRestaurantStore, useUserStore, type SearchDbResult, type SearchKakaoResult } from "@/lib/store";
import { unlockRestaurant } from "@/lib/api";
import { CATEGORY_LABELS } from "@/types";
import type { LockedRestaurant, UnlockedRestaurant } from "@/types";
import UnlockModal from "./UnlockModal";
import RestaurantDetail from "./RestaurantDetail";

function LockedCard({ restaurant, onUnlock }: { restaurant: LockedRestaurant; onUnlock: (id: string) => void }) {
  return (
    <div
      onClick={() => onUnlock(restaurant.id)}
      className="flex items-center gap-3 p-3 bg-white dark:bg-tn-bg-card border border-gray-100 dark:border-tn-border rounded-xl hover:border-orange-200 dark:hover:border-tn-orange transition cursor-pointer"
    >
      <div className="flex-shrink-0 w-7 h-7 bg-gray-300 dark:bg-tn-fg-dark rounded-full flex items-center justify-center">
        <span className="text-[10px]">🔒</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-400 dark:text-tn-fg-dark truncate">잠긴 맛집</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-gray-500 dark:text-tn-fg-dark">
            {restaurant.category ? CATEGORY_LABELS[restaurant.category] : "음식점"}
          </span>
          <span className="text-[10px] text-gray-300 dark:text-tn-fg-dark">•</span>
          <span className="text-[10px] text-gray-400 dark:text-tn-fg-dark">{restaurant.areaHint}</span>
          <span className="text-[10px] text-gray-300 dark:text-tn-fg-dark">•</span>
          <span className="text-[10px] font-semibold text-orange-500">🔥 {restaurant.revisitScore}회</span>
        </div>
      </div>
      <span className="flex-shrink-0 text-[10px] text-orange-500 font-medium">5P 열람</span>
    </div>
  );
}

const SOURCE_BADGE: Record<string, string> = {
  assembly: "🏛️ 국회의원",
  seoul_expense: "🏙️ 서울시",
  user: "👤 유저",
};

function UnlockedCard({ restaurant, onClick, index }: { restaurant: UnlockedRestaurant; onClick: () => void; index: number }) {
  return (
    <div onClick={onClick} className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-tn-orange/10 border border-orange-100 dark:border-tn-orange/20 rounded-xl cursor-pointer hover:border-orange-200 dark:hover:border-orange-700 transition">
      <div className="flex-shrink-0 w-7 h-7 bg-[#FF6B35] rounded-full flex items-center justify-center">
        <span className="text-xs font-bold text-white">{index}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-tn-fg-bright truncate">{restaurant.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {restaurant.source && (
            <span className="text-[10px] text-gray-500 dark:text-tn-fg-dark">
              {SOURCE_BADGE[restaurant.source] || restaurant.source}
            </span>
          )}
          <span className="text-[10px] text-gray-300 dark:text-tn-fg-dark">•</span>
          <span className="text-[10px] text-gray-500 dark:text-tn-fg-dark">
            {restaurant.category ? CATEGORY_LABELS[restaurant.category] : "음식점"}
          </span>
          <span className="text-[10px] text-gray-300 dark:text-tn-fg-dark">•</span>
          <span className="text-[10px] font-semibold text-orange-500">🔥 {restaurant.revisitScore}회</span>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-tn-fg-dark truncate mt-0.5">{restaurant.address}</p>
      </div>
    </div>
  );
}

export default function RestaurantList() {
  const { restaurants, isLoading, setRestaurants, searchQuery, sortBy, searchDbResults, searchKakaoResults, isSearching, setSearchResults } = useRestaurantStore();
  const { userId, isLoggedIn, points, setPoints, login } = useUserStore();
  const [unlockTarget, setUnlockTarget] = useState<LockedRestaurant | null>(null);
  const { selectedId, setSelectedId } = useRestaurantStore();
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId) {
      setDetailId(selectedId);
      setSelectedId(null);
    }
  }, [selectedId, setSelectedId]);

  const handleUnlockClick = (restaurantId: string) => {
    if (!isLoggedIn) { login(); return; }
    const target = restaurants.find((r) => r.id === restaurantId && r.locked);
    if (target && target.locked) setUnlockTarget(target);
  };

  const handleConfirmUnlock = async () => {
    if (!unlockTarget || !userId) throw new Error("로그인이 필요합니다");
    const result = await unlockRestaurant(unlockTarget.id, userId);
    if (result.error) throw new Error(result.error);
    setRestaurants(
      restaurants.map((r) =>
        r.id === unlockTarget.id
          ? { id: result.restaurant.id, name: result.restaurant.name, address: result.restaurant.address, category: result.restaurant.category, location: { lat: result.restaurant.lat, lng: result.restaurant.lng }, revisitScore: r.revisitScore, source: (r as any).source, locked: false as const }
          : r
      )
    );
    if (result.remainingPoints !== undefined) setPoints(result.remainingPoints);

    // 검색 결과도 갱신
    if (searchDbResults.length > 0) {
      setSearchResults(
        searchDbResults.map((sr) =>
          sr.id === unlockTarget.id
            ? { ...sr, name: result.restaurant.name, address: result.restaurant.address, locked: false, placeUrl: result.restaurant.placeId ? `https://place.map.kakao.com/${result.restaurant.placeId}` : null }
            : sr
        ),
        searchKakaoResults
      );
    }
  };

  // 검색 필터링
  const filtered = restaurants.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (!r.locked && "name" in r) {
      return r.name.toLowerCase().includes(q) || r.address?.toLowerCase().includes(q);
    }
    // locked: areaHint로 검색
    if (r.locked && "areaHint" in r) {
      return r.areaHint?.toLowerCase().includes(q);
    }
    return false;
  });

  // 정렬
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") {
      const nameA = a.locked ? "zzz" : ("name" in a ? a.name : "");
      const nameB = b.locked ? "zzz" : ("name" in b ? b.name : "");
      return nameA.localeCompare(nameB, "ko");
    }
    return b.revisitScore - a.revisitScore;
  });

  const SOURCE_LABEL: Record<string, string> = {
    assembly: "🏛️",
    seoul_expense: "🏙️",
    user: "👤",
  };

  // 검색 API 결과 모드
  const isApiSearchMode = searchQuery.length >= 2;

  if (isApiSearchMode) {
    if (isSearching) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400 dark:text-tn-fg-dark ml-2">검색 중...</span>
        </div>
      );
    }

    if (searchDbResults.length === 0 && searchKakaoResults.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <span className="text-3xl mb-2">🔍</span>
          <p className="text-sm text-gray-400 dark:text-tn-fg-dark text-center">
            &ldquo;{searchQuery}&rdquo; 검색 결과가 없어요.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 px-4 pb-4">
        {searchDbResults.length > 0 && (
          <>
            <h2 className="text-xs font-semibold text-orange-500 py-1">🔥 또간집 등록 맛집 ({searchDbResults.length})</h2>
            {searchDbResults.map((r, idx) => (
              <div
                key={r.id}
                onClick={() => {
                  if (r.locked) {
                    // 잠금 해제 모달
                    if (!isLoggedIn) { login(); return; }
                    setUnlockTarget({ id: r.id, category: r.category as any, areaHint: r.address, revisitScore: r.totalVisits, locked: true } as LockedRestaurant);
                  } else {
                    setDetailId(r.id);
                  }
                }}
                className={`flex items-center gap-3 p-3 rounded-xl transition ${
                  r.locked
                    ? "bg-white dark:bg-tn-bg-card border border-gray-100 dark:border-tn-border"
                    : "bg-orange-50 dark:bg-tn-orange/10 border border-orange-100 dark:border-tn-orange/20 hover:border-orange-200 cursor-pointer"
                }`}
              >
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  r.locked ? "bg-gray-300 dark:bg-tn-fg-dark" : "bg-[#FF6B35]"
                }`}>
                  <span className="text-xs font-bold text-white">{r.locked ? "🔒" : idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${
                    r.locked ? "text-gray-400 dark:text-tn-fg-dark" : "text-gray-900 dark:text-tn-fg-bright"
                  }`}>
                    {r.locked ? "잠긴 맛집" : r.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {!r.locked && r.source && (
                      <span className="text-[10px] text-gray-500 dark:text-tn-fg-dark">
                        {SOURCE_LABEL[r.source] || r.source}
                      </span>
                    )}
                    {!r.locked && r.source && <span className="text-[10px] text-gray-300 dark:text-tn-fg-dark">•</span>}
                    <span className="text-[10px] text-gray-500 dark:text-tn-fg-dark">
                      {CATEGORY_LABELS[r.category as keyof typeof CATEGORY_LABELS] || r.category || "음식점"}
                    </span>
                    <span className="text-[10px] text-gray-300 dark:text-tn-fg-dark">•</span>
                    <span className="text-[10px] font-semibold text-orange-500">🔥 {r.totalVisits}회</span>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-tn-fg-dark truncate mt-0.5">{r.address}</p>
                </div>
                {r.locked && <span className="flex-shrink-0 text-[10px] text-orange-500 font-medium">5P 열람</span>}
              </div>
            ))}
          </>
        )}

        {searchKakaoResults.length > 0 && (
          <>
            <h2 className="text-xs font-semibold text-gray-400 dark:text-tn-fg-dark py-1 mt-1">📍 카카오맵 검색 ({searchKakaoResults.length})</h2>
            {searchKakaoResults.map((r) => (
              <a
                key={r.placeId}
                href={r.placeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-white dark:bg-tn-bg-card border border-gray-100 dark:border-tn-border rounded-xl hover:border-gray-200 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-tn-fg truncate">{r.name}</p>
                  <p className="text-[10px] text-gray-400 dark:text-tn-fg-dark truncate">{r.address}</p>
                </div>
                <span className="text-[10px] text-gray-300 dark:text-tn-fg-dark flex-shrink-0">카카오맵 →</span>
              </a>
            ))}
          </>
        )}

        {detailId && <RestaurantDetail restaurantId={detailId} onClose={() => setDetailId(null)} />}
        {unlockTarget && (
          <UnlockModal restaurant={unlockTarget} userPoints={points} onConfirm={handleConfirmUnlock} onClose={() => setUnlockTarget(null)} />
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-400 dark:text-tn-fg-dark ml-2">로딩 중...</span>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <span className="text-3xl mb-2">{searchQuery ? "🔍" : "🗺️"}</span>
        <p className="text-sm text-gray-400 dark:text-tn-fg-dark text-center">
          {searchQuery
            ? `"${searchQuery}" 검색 결과가 없어요.`
            : "이 지역에 등록된 재방문 맛집이 없어요.\n지도를 이동해보세요!"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4 pb-4">
      <div className="flex items-center justify-between py-1">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-tn-fg-dark">
          재방문 맛집 {sorted.length}곳{searchQuery && ` (검색: ${searchQuery})`}
        </h2>
      </div>
      {(() => {
        let unlockedIdx = 0;
        return sorted.map((r) =>
          r.locked ? (
            <LockedCard key={r.id} restaurant={r} onUnlock={handleUnlockClick} />
          ) : (
            <UnlockedCard key={r.id} restaurant={r} index={++unlockedIdx} onClick={() => setDetailId(r.id)} />
          )
        );
      })()}
      {detailId && <RestaurantDetail restaurantId={detailId} onClose={() => setDetailId(null)} />}
      {unlockTarget && (
        <UnlockModal restaurant={unlockTarget} userPoints={points} onConfirm={handleConfirmUnlock} onClose={() => setUnlockTarget(null)} />
      )}
    </div>
  );
}
