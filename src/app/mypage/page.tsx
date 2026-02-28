"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, type Category } from "@/types";
import { useThemeStore } from "@/lib/theme";
import { useUserStore } from "@/lib/store";

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
  const { logout } = useUserStore();

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
        <div className="w-6 h-6 border-2 border-tn-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-dvh bg-ctp-mantle dark:bg-tn-bg">
      {/* 헤더 */}
      <header className="bg-ctp-base dark:bg-tn-bg border-b border-ctp-surface0 dark:border-tn-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="text-ctp-overlay hover:text-ctp-subtext dark:text-tn-fg dark:text-tn-fg-dark">
          ← 
        </button>
        <h1 className="text-base font-bold text-ctp-text dark:text-tn-fg-bright">마이페이지</h1>
      </header>

      {/* 프로필 카드 */}
      <div className="bg-ctp-base dark:bg-tn-bg-card m-4 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xl">👤</span>
          </div>
          <div>
            <p className="text-base font-bold text-ctp-text dark:text-tn-fg-bright">{data.user.name}</p>
            <p className="text-xs text-ctp-overlay dark:text-tn-fg-dark">{data.user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center bg-blue-50 dark:bg-tn-blue/10 rounded-xl p-3">
            <p className="text-lg font-bold text-tn-blue">{data.user.points}</p>
            <p className="text-[10px] text-ctp-subtext dark:text-tn-fg-dark">보유 포인트</p>
          </div>
          <div className="text-center bg-ctp-mantle dark:bg-tn-bg-highlight rounded-xl p-3">
            <p className="text-lg font-bold text-ctp-text dark:text-tn-fg">{data.stats.totalUnlocked}</p>
            <p className="text-[10px] text-ctp-subtext dark:text-tn-fg-dark">열람한 맛집</p>
          </div>
          <div className="text-center bg-ctp-mantle dark:bg-tn-bg-highlight rounded-xl p-3">
            <p className="text-lg font-bold text-ctp-text dark:text-tn-fg">{data.stats.totalSpent}P</p>
            <p className="text-[10px] text-ctp-subtext dark:text-tn-fg-dark">사용한 포인트</p>
          </div>
        </div>
      </div>

      {/* 테마 설정 */}
      <div className="bg-ctp-base dark:bg-tn-bg-card mx-4 mb-4 p-4 rounded-2xl shadow-sm">
        <h3 className="text-xs font-semibold text-ctp-overlay dark:text-tn-fg-dark mb-2">테마 설정</h3>
        <div className="flex gap-2">
          {([["system", "🖥️ 시스템"], ["light", "☀️ 밝게"], ["dark", "🌙 어둡게"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
                mode === key
                  ? "bg-tn-blue text-white"
                  : "bg-ctp-mantle dark:bg-tn-bg-highlight text-ctp-subtext dark:text-tn-fg-dark"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mx-4 bg-ctp-mantle dark:bg-tn-bg-card rounded-xl p-1">
        <button
          onClick={() => setTab("unlocked")}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
            tab === "unlocked" ? "bg-ctp-base dark:bg-tn-bg-highlight text-ctp-text dark:text-tn-fg-bright shadow-sm" : "text-ctp-subtext dark:text-tn-fg-dark"
          }`}
        >
          🔓 열람 기록 ({data.unlockedRestaurants.length})
        </button>
        <button
          onClick={() => setTab("points")}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
            tab === "points" ? "bg-ctp-base dark:bg-tn-bg-highlight text-ctp-text dark:text-tn-fg-bright shadow-sm" : "text-ctp-subtext dark:text-tn-fg-dark"
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
                <p className="text-sm text-ctp-overlay dark:text-tn-fg-dark">아직 열람한 맛집이 없어요</p>
              </div>
            ) : (
              data.unlockedRestaurants.map((r) => (
                <div key={r.restaurantId} className="bg-ctp-base dark:bg-tn-bg-card p-3 rounded-xl flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ctp-text dark:text-tn-blue truncate">{r.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {r.source && (
                        <span className="text-[10px] text-ctp-overlay dark:text-tn-fg-dark">
                          {SOURCE_LABEL[r.source] || r.source}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-300 dark:text-tn-fg-dark">•</span>
                      <span className="text-[10px] text-ctp-overlay dark:text-tn-fg-dark">
                        {r.category ? CATEGORY_LABELS[r.category] : "음식점"}
                      </span>
                      <span className="text-[10px] text-gray-300 dark:text-tn-fg-dark">•</span>
                      <span className="text-[10px] text-tn-blue font-medium">
                        🔥 {r.totalVisits}회
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-300 dark:text-tn-fg-dark">
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
                <p className="text-sm text-ctp-overlay dark:text-tn-fg-dark">포인트 내역이 없어요</p>
              </div>
            ) : (
              data.pointHistory.map((p, i) => (
                <div key={i} className="bg-ctp-base dark:bg-tn-bg-card p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm text-ctp-text dark:text-tn-fg">
                      {POINT_TYPE_LABELS[p.type] || p.type}
                    </p>
                    <p className="text-[10px] text-ctp-overlay dark:text-tn-fg-dark">
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

      {/* 로그아웃 */}
      <div className="px-4 pb-8">
        <button
          onClick={() => { logout(); router.push("/"); }}
          className="w-full py-3 text-sm text-red-500 dark:text-tn-red bg-ctp-base dark:bg-tn-bg-card rounded-xl border border-ctp-surface0 dark:border-tn-border hover:bg-red-50 dark:hover:bg-tn-red/10 transition"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
