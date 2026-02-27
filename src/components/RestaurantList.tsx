"use client";

import { useRestaurantStore, useUserStore } from "@/lib/store";
import { CATEGORY_LABELS } from "@/types";
import type { Restaurant, LockedRestaurant, UnlockedRestaurant } from "@/types";

function LockedCard({ restaurant }: { restaurant: LockedRestaurant }) {
  return (
    <div className="p-4 border border-gray-200 rounded-xl bg-white/80 backdrop-blur">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🔒</span>
        <span className="text-sm font-medium text-gray-500">
          {restaurant.category
            ? CATEGORY_LABELS[restaurant.category]
            : "음식점"}
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-2">{restaurant.areaHint}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-orange-500">
          🔥 재방문 {restaurant.revisitScore}회
        </span>
        <button className="text-xs bg-orange-500 text-white px-3 py-1 rounded-full hover:bg-orange-600 transition">
          5P로 열기
        </button>
      </div>
    </div>
  );
}

function UnlockedCard({ restaurant }: { restaurant: UnlockedRestaurant }) {
  return (
    <div className="p-4 border border-orange-200 rounded-xl bg-orange-50/80 backdrop-blur">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🍽️</span>
        <span className="font-bold text-gray-900">{restaurant.name}</span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{restaurant.address}</p>
      <div className="flex items-center gap-2">
        {restaurant.category && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {CATEGORY_LABELS[restaurant.category]}
          </span>
        )}
        <span className="text-xs font-semibold text-orange-500">
          🔥 재방문 {restaurant.revisitScore}회
        </span>
      </div>
    </div>
  );
}

export default function RestaurantList() {
  const { restaurants, isLoading } = useRestaurantStore();

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        로딩 중...
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        이 지역에 등록된 재방문 맛집이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold text-gray-500">
        현재 지역 재방문 맛집 ({restaurants.length})
      </h2>
      {restaurants.map((r) =>
        r.locked ? (
          <LockedCard key={r.id} restaurant={r} />
        ) : (
          <UnlockedCard key={r.id} restaurant={r} />
        )
      )}
    </div>
  );
}
