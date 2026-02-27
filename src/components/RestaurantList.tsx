"use client";

import { useState } from "react";
import { useRestaurantStore, useUserStore } from "@/lib/store";
import { unlockRestaurant } from "@/lib/api";
import { CATEGORY_LABELS } from "@/types";
import type { LockedRestaurant, UnlockedRestaurant } from "@/types";
import UnlockModal from "./UnlockModal";

function LockedCard({ restaurant, onUnlock }: { restaurant: LockedRestaurant; onUnlock: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-orange-200 transition">
      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-lg">🔒</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">
            {restaurant.category
              ? CATEGORY_LABELS[restaurant.category]
              : "음식점"}
          </span>
          <span className="text-[10px] text-gray-300">•</span>
          <span className="text-xs text-gray-400">{restaurant.areaHint}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs font-semibold text-orange-500">
            🔥 {restaurant.revisitScore}회 재방문
          </span>
        </div>
      </div>
      <button
        onClick={() => onUnlock(restaurant.id)}
        className="flex-shrink-0 text-[11px] bg-orange-500 text-white px-2.5 py-1 rounded-full hover:bg-orange-600 transition font-medium"
      >
        5P
      </button>
    </div>
  );
}

const SOURCE_BADGE: Record<string, string> = {
  assembly: "🏛️ 국회의원",
  seoul_expense: "🏙️ 서울시",
  user: "👤 유저",
};

function UnlockedCard({ restaurant }: { restaurant: UnlockedRestaurant }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
      <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
        <span className="text-lg">🍽️</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">
          {restaurant.name}
        </p>
        <p className="text-xs text-gray-500 truncate">{restaurant.address}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {restaurant.source && (
            <span className="text-[10px] bg-white text-gray-500 px-1.5 py-0.5 rounded">
              {SOURCE_BADGE[restaurant.source] || restaurant.source}
            </span>
          )}
          {restaurant.category && (
            <span className="text-[10px] bg-white text-gray-500 px-1.5 py-0.5 rounded">
              {CATEGORY_LABELS[restaurant.category]}
            </span>
          )}
          <span className="text-xs font-semibold text-orange-500">
            🔥 {restaurant.revisitScore}회
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantList() {
  const { restaurants, isLoading, setRestaurants } = useRestaurantStore();
  const { userId, isLoggedIn, points, setPoints, login } = useUserStore();
  const [unlockTarget, setUnlockTarget] = useState<LockedRestaurant | null>(null);

  const handleUnlockClick = (restaurantId: string) => {
    if (!isLoggedIn) {
      login();
      return;
    }
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
          ? {
              id: result.restaurant.id,
              name: result.restaurant.name,
              address: result.restaurant.address,
              category: result.restaurant.category,
              location: { lat: result.restaurant.lat, lng: result.restaurant.lng },
              revisitScore: r.revisitScore,
              source: (r as any).source,
              locked: false as const,
            }
          : r
      )
    );

    if (result.remainingPoints !== undefined) {
      setPoints(result.remainingPoints);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-400 ml-2">로딩 중...</span>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <span className="text-3xl mb-2">🗺️</span>
        <p className="text-sm text-gray-400 text-center">
          이 지역에 등록된 재방문 맛집이 없어요.
          <br />
          지도를 이동해보세요!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4 pb-4">
      <div className="flex items-center justify-between py-1">
        <h2 className="text-xs font-semibold text-gray-400">
          재방문 맛집 {restaurants.length}곳
        </h2>
      </div>
      {restaurants.map((r) =>
        r.locked ? (
          <LockedCard key={r.id} restaurant={r} onUnlock={handleUnlockClick} />
        ) : (
          <UnlockedCard key={r.id} restaurant={r} />
        )
      )}

      {unlockTarget && (
        <UnlockModal
          restaurant={unlockTarget}
          userPoints={points}
          onConfirm={handleConfirmUnlock}
          onClose={() => setUnlockTarget(null)}
        />
      )}
    </div>
  );
}
