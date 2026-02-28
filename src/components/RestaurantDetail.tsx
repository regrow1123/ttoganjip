"use client";

import { useState, useEffect } from "react";
import { CATEGORY_LABELS, type Category } from "@/types";

interface RestaurantDetailProps {
  restaurantId: string;
  onClose: () => void;
}

interface DetailData {
  id: string;
  name?: string;
  address?: string;
  category?: Category;
  region?: string;
  source?: string;
  totalVisits: number;
  placeId?: string | null;
  kakaoMapUrl?: string | null;
  locked: boolean;
  expenses?: {
    date: string;
    amount: number;
    purpose: string;
    memberName: string;
    party: string;
  }[];
}

const SOURCE_LABEL: Record<string, string> = {
  assembly: "국회의원 업무추진비",
  seoul_expense: "서울시 공무원 업무추진비",
  user: "유저 인증",
};

export default function RestaurantDetail({ restaurantId, onClose }: RestaurantDetailProps) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/restaurants/${restaurantId}`)
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [restaurantId]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-ctp-base dark:bg-tn-bg-card w-full sm:w-[420px] sm:max-h-[80vh] max-h-[70vh] mb-14 sm:mb-0 sm:rounded-2xl rounded-t-2xl overflow-hidden animate-slide-up flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-ctp-surface0 dark:border-tn-border">
          <h2 className="text-base font-bold text-ctp-text dark:text-tn-fg-bright">
            {loading ? "로딩 중..." : data?.locked ? "🔒 잠긴 맛집" : data?.name || "맛집 정보"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-ctp-overlay dark:text-tn-fg-dark hover:text-ctp-subtext dark:hover:text-tn-fg rounded-full hover:bg-ctp-mantle"
          >
            ✕
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-tn-blue border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && data?.locked && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 bg-ctp-mantle dark:bg-tn-bg-highlight rounded-2xl flex items-center justify-center">
                <span className="text-3xl">🔒</span>
              </div>
              <div className="text-center">
                <p className="text-sm text-ctp-subtext dark:text-tn-fg-dark mb-1">
                  {data.category ? CATEGORY_LABELS[data.category] : "음식점"} · {data.region || "서울"}
                </p>
                <p className="text-lg font-bold text-tn-blue">🔥 {data.totalVisits}회 재방문</p>
              </div>
              <p className="text-xs text-ctp-overlay dark:text-tn-fg-dark text-center">
                잠금을 해제하면 상호명, 주소, 상세 정보를 확인할 수 있어요
              </p>
            </div>
          )}

          {!loading && data && !data.locked && (
            <div className="flex flex-col gap-4">
              {/* 기본 정보 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {data.source && (
                    <span className="text-[10px] bg-blue-50 text-tn-blue px-2 py-0.5 rounded-full font-medium">
                      {SOURCE_LABEL[data.source] || data.source}
                    </span>
                  )}
                  {data.category && (
                    <span className="text-[10px] bg-ctp-mantle dark:bg-tn-bg-highlight text-ctp-subtext dark:text-tn-fg-dark px-2 py-0.5 rounded-full">
                      {CATEGORY_LABELS[data.category]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-ctp-subtext dark:text-tn-fg">{data.address}</p>
                <p className="text-base font-bold text-tn-blue">🔥 {data.totalVisits}회 재방문</p>
              </div>

              {/* 카카오맵 버튼 */}
              {data.kakaoMapUrl && (
                <a
                  href={data.kakaoMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 bg-[#FEE500] text-[#191919] rounded-xl text-sm font-bold hover:bg-[#FDD800] transition"
                >
                  🗺️ 카카오맵에서 보기
                </a>
              )}

              {/* 국회의원 업무추진비 내역 */}
              {data.expenses && data.expenses.length > 0 && (
                <div className="mt-2">
                  <h3 className="text-xs font-semibold text-ctp-overlay dark:text-tn-fg-dark mb-2">
                    📋 업무추진비 사용 내역 ({data.expenses.length}건)
                  </h3>
                  <div className="flex flex-col gap-2">
                    {data.expenses.map((e, i) => (
                      <div
                        key={i}
                        className="bg-ctp-mantle dark:bg-tn-bg-highlight rounded-lg p-3 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-ctp-text dark:text-tn-fg">
                            {e.memberName} ({e.party})
                          </span>
                          <span className="text-ctp-overlay dark:text-tn-fg-dark">{e.date}</span>
                        </div>
                        {e.amount && (
                          <span className="text-ctp-subtext dark:text-tn-fg-dark dark:text-tn-fg-dark">
                            {e.amount.toLocaleString()}원
                          </span>
                        )}
                        {e.purpose && (
                          <p className="text-ctp-overlay dark:text-tn-fg-dark mt-1">{e.purpose}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
