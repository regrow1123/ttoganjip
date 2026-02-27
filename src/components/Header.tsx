"use client";

import { useUserStore } from "@/lib/store";

export default function Header() {
  const { points, isLoggedIn } = useUserStore();

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="flex items-center gap-2">
        <span className="text-xl">🔥</span>
        <h1 className="text-lg font-bold text-gray-900">또간집</h1>
      </div>
      <div className="flex items-center gap-3">
        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-orange-500">
              {points}P
            </span>
            <button className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-200 transition">
              마이
            </button>
          </div>
        ) : (
          <button className="text-sm bg-orange-500 text-white px-4 py-1.5 rounded-full hover:bg-orange-600 transition">
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
