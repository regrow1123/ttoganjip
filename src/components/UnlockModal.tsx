"use client";

import { useState } from "react";

interface UnlockModalProps {
  restaurant: {
    id: string;
    category?: string | null;
    areaHint?: string;
    revisitScore: number;
  };
  userPoints: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function UnlockModal({
  restaurant,
  userPoints,
  onConfirm,
  onClose,
}: UnlockModalProps) {
  const [status, setStatus] = useState<"confirm" | "loading" | "success" | "error">("confirm");
  const [result, setResult] = useState<{ name: string; address: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleConfirm = async () => {
    setStatus("loading");
    try {
      await onConfirm();
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message || "오류가 발생했습니다");
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && status !== "loading" && onClose()}
    >
      <div className="bg-white dark:bg-tn-bg-card w-full sm:w-[360px] sm:rounded-2xl rounded-t-2xl p-5 pb-8 sm:pb-5 animate-slide-up">
        {status === "confirm" && (
          <>
            <div className="flex flex-col items-center gap-3 mb-5">
              <div className="w-14 h-14 bg-orange-100 dark:bg-tn-orange/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔓</span>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-tn-fg-bright">맛집 정보를 확인할까요?</h3>
              <p className="text-sm text-gray-500 dark:text-tn-fg-dark text-center">
                {restaurant.areaHint} · {restaurant.category || "음식점"} · 🔥 {restaurant.revisitScore}회 재방문
              </p>
            </div>
            <div className="flex items-center justify-between bg-gray-50 dark:bg-tn-bg-highlight rounded-xl p-3 mb-4">
              <span className="text-sm text-gray-600 dark:text-tn-fg">차감 포인트</span>
              <span className="text-sm font-bold text-orange-500">-5P</span>
            </div>
            <div className="flex items-center justify-between px-1 mb-5">
              <span className="text-xs text-gray-400 dark:text-tn-fg-dark">보유 포인트</span>
              <span className="text-xs text-gray-500 dark:text-tn-fg-dark dark:text-tn-fg-dark">{userPoints}P → {userPoints - 5}P</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 dark:bg-tn-bg-highlight rounded-xl hover:bg-gray-200 transition"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={userPoints < 5}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {userPoints < 5 ? "포인트 부족" : "확인하기"}
              </button>
            </div>
          </>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-tn-fg-dark dark:text-tn-fg-dark">맛집 정보를 가져오는 중...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-14 h-14 bg-green-100 dark:bg-tn-green/10 rounded-full flex items-center justify-center animate-bounce-once">
              <span className="text-2xl">🎉</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-tn-fg-bright">잠금 해제 완료!</h3>
            <p className="text-xs text-gray-400 dark:text-tn-fg-dark">-5P 차감되었습니다</p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2.5 text-sm font-bold text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition"
            >
              확인
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-14 h-14 bg-red-100 dark:bg-tn-red/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">😥</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-tn-fg-bright">오류</h3>
            <p className="text-sm text-gray-500 dark:text-tn-fg-dark dark:text-tn-fg-dark">{errorMsg}</p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2.5 text-sm font-medium text-gray-600 bg-gray-100 dark:bg-tn-bg-highlight rounded-xl hover:bg-gray-200 transition"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
