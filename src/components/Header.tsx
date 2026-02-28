"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store";

export default function Header() {
  const router = useRouter();
  const { points, isLoggedIn, name, login, logout, fetchMe } = useUserStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <header className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-ctp-base/95 dark:bg-tn-bg/95 backdrop-blur-sm border-b border-ctp-surface0 dark:border-tn-border z-40">
      <div className="flex items-center gap-1.5">
        <h1 className="text-base font-bold text-ctp-text dark:text-tn-fg-bright">또간집</h1>
        <span className="text-[10px] text-ctp-overlay dark:text-tn-fg-dark ml-1 hidden sm:inline">
          재방문이 증명하는 진짜 맛집
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          <>
            <span className="text-xs font-semibold text-tn-blue bg-blue-50 dark:bg-tn-blue/10 px-2 py-1 rounded-full">
              {points}P
            </span>
            <button
              onClick={() => router.push("/receipt")}
              className="text-xs bg-tn-blue text-white px-3 py-1.5 rounded-full hover:bg-blue-600 transition font-medium"
            >
              📸
            </button>
            <button
              onClick={() => router.push("/mypage")}
              className="text-xs bg-ctp-mantle dark:bg-tn-bg-card text-ctp-text dark:text-tn-fg px-3 py-1.5 rounded-full hover:bg-ctp-surface0 dark:hover:bg-tn-bg-highlight transition"
            >
              MY
            </button>
          </>
        ) : (
          <button
            onClick={login}
            className="text-xs bg-tn-blue text-white px-3 py-1.5 rounded-full hover:bg-blue-600 transition font-medium"
          >
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
