"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, type Category } from "@/types";
import { useThemeStore } from "@/lib/theme";

const POINT_TYPE_LABELS: Record<string, string> = {
  unlock: "🔓 맛집 열람",
  signup_bonus: "🎉 가입 보너스",
  visit_first: "📸 첫 방문 인증",
  visit_revisit: "🔥 재방문 인증",
};

const SOURCE_LABEL: Record<string, string> = {
  assembly: "🏛️ 국회의원",
  seoul_expense: "🏙️ 서울시",
  user: "👤 유저",
};

interface MyPageData {
  user: { id: string; name: string; email: string; points: number; createdAt: string };
  stats: { totalUnlocked: number; totalSpent: number };
  unlockedRestaurants: {
    restaurantId: string;
    unlockedAt: string;
    name: string;
    category: Category;
    region: string;
    source: string;
    totalVisits: number;
  }[];
  pointHistory: { amount: number; type: string; createdAt: string }[];
}

export default function MyPage() {
  const router = useRouter();
  const [data, setData] = useState<MyPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"unlocked" | "points">("unlocked");
  const { mode, setMode } = useThemeStore();

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => {
        if (!res.ok) { router.push("/"); return null; }
        return res.json();
      })
      .then((d) => d && setData(d))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950">
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
          ← 
        </button>
        <h1 className="text-base font-bold">마이페이지</h1>
      </header>

      {/* 프로필 카드 */}
      <div className="bg-white dark:bg-gray-800 m-4 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <span className="text-xl">👤</span>
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">{data.user.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">{data.user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center bg-orange-50 dark:bg-orange-900/30 rounded-xl p-3">
            <p className="text-lg font-bold text-orange-500">{data.user.points}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">보유 포인트</p>
          </div>
          <div className="text-center bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
            <p className="text-lg font-bold text-gray-700 dark:text-gray-200">{data.stats.totalUnlocked}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">열람한 맛집</p>
          </div>
          <div className="text-center bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
            <p className="text-lg font-bold text-gray-700 dark:text-gray-200">{data.stats.totalSpent}P</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">사용한 포인트</p>
          </div>
        </div>
      </div>

      {/* 테마 설정 */}
      <div className="bg-white dark:bg-gray-800 mx-4 mb-4 p-4 rounded-2xl shadow-sm">
        <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">테마 설정</h3>
        <div className="flex gap-2">
          {([["system", "🖥️ 시스템"], ["light", "☀️ 밝게"], ["dark", "🌙 어둡게"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
                mode === key
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mx-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        <button
          onClick={() => setTab("unlocked")}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
            tab === "unlocked" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          🔓 열람 기록 ({data.unlockedRestaurants.length})
        </button>
        <button
          onClick={() => setTab("points")}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
            tab === "points" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          💰 포인트 내역
        </button>
      </div>

      {/* 콘텐츠 */}
      <div className="p-4">
        {tab === "unlocked" && (
          <div className="flex flex-col gap-2">
            {data.unlockedRestaurants.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-3xl mb-2 block">🔒</span>
                <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400">아직 열람한 맛집이 없어요</p>
              </div>
            ) : (
              data.unlockedRestaurants.map((r) => (
                <div key={r.restaurantId} className="bg-white dark:bg-gray-800 p-3 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                    <span className="text-lg">🍽️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {r.source && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400">
                          {SOURCE_LABEL[r.source] || r.source}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-300">•</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400">
                        {r.category ? CATEGORY_LABELS[r.category] : "음식점"}
                      </span>
                      <span className="text-[10px] text-gray-300">•</span>
                      <span className="text-[10px] text-orange-500 font-medium">
                        🔥 {r.totalVisits}회
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-300">
                    {new Date(r.unlockedAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "points" && (
          <div className="flex flex-col gap-2">
            {data.pointHistory.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-3xl mb-2 block">💰</span>
                <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400">포인트 내역이 없어요</p>
              </div>
            ) : (
              data.pointHistory.map((p, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      {POINT_TYPE_LABELS[p.type] || p.type}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400">
                      {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      p.amount > 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {p.amount > 0 ? "+" : ""}{p.amount}P
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
