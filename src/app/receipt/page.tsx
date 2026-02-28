"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "uploading" | "success" | "error";

interface VerifyResult {
  success?: boolean;
  restaurant?: string;
  isFirstVisit?: boolean;
  pointsEarned?: number;
  totalPoints?: number;
  message?: string;
  error?: string;
  ocrText?: string;
}

export default function ReceiptPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<VerifyResult | null>(null);

  const handleFile = (file: File) => {
    setPreview(URL.createObjectURL(file));
    setStatus("idle");
    setResult(null);
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStatus("uploading");
    const formData = new FormData();
    formData.append("receipt", file);

    try {
      const res = await fetch("/api/receipts/verify", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setResult(data);
      } else {
        setStatus("error");
        setResult(data);
      }
    } catch {
      setStatus("error");
      setResult({ error: "네트워크 오류가 발생했습니다" });
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-tn-bg">
      <header className="bg-white dark:bg-tn-bg border-b border-gray-100 dark:border-tn-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="text-gray-500 dark:text-tn-fg-dark hover:text-gray-700">
          ←
        </button>
        <h1 className="text-base font-bold text-gray-900 dark:text-tn-fg-bright">📸 영수증 인증</h1>
      </header>

      <div className="p-4 flex flex-col gap-4 max-w-md mx-auto">
        {/* 안내 */}
        <div className="bg-orange-50 dark:bg-tn-orange/10 rounded-xl p-4">
          <h2 className="text-sm font-bold text-orange-600 dark:text-tn-orange mb-1">방문 인증하고 포인트 받기!</h2>
          <p className="text-xs text-gray-500 dark:text-tn-fg-dark leading-relaxed">
            식당 영수증을 촬영하면 자동으로 식당을 인식해요.<br />
            첫 방문 +10P, 재방문 +20P!
          </p>
        </div>

        {/* 업로드 영역 */}
        <div
          onClick={() => fileRef.current?.click()}
          className="bg-white dark:bg-tn-bg-card border-2 border-dashed border-gray-200 dark:border-tn-border rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-orange-300 transition"
        >
          {preview ? (
            <img src={preview} alt="영수증" className="max-h-64 rounded-lg object-contain" />
          ) : (
            <>
              <span className="text-4xl">📸</span>
              <p className="text-sm text-gray-400 dark:text-tn-fg-dark">영수증 촬영 또는 갤러리에서 선택</p>
            </>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {/* 인증 버튼 */}
        {preview && status !== "uploading" && (
          <button
            onClick={handleUpload}
            className="w-full py-3 text-sm font-bold text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition"
          >
            🔍 영수증 인증하기
          </button>
        )}

        {/* 로딩 */}
        {status === "uploading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-tn-fg-dark">영수증 분석 중...</p>
            <p className="text-[10px] text-gray-400 dark:text-tn-fg-dark">OCR로 텍스트를 추출하고 있어요</p>
          </div>
        )}

        {/* 성공 */}
        {status === "success" && result && (
          <div className="bg-white dark:bg-tn-bg-card rounded-xl p-5 flex flex-col items-center gap-3 animate-slide-up">
            <div className="w-16 h-16 bg-green-100 dark:bg-tn-green/10 rounded-full flex items-center justify-center animate-bounce-once">
              <span className="text-3xl">🎉</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-tn-fg-bright">인증 성공!</h3>
            <p className="text-sm text-gray-600 dark:text-tn-fg">
              <span className="font-bold text-orange-500">{result.restaurant}</span>
              {result.isFirstVisit ? " 첫 방문" : " 재방문"}
            </p>
            <div className="bg-orange-50 dark:bg-tn-orange/10 rounded-lg px-4 py-2">
              <span className="text-lg font-bold text-orange-500">+{result.pointsEarned}P</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-tn-fg-dark">보유 포인트: {result.totalPoints}P</p>
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={() => { setPreview(null); setStatus("idle"); setResult(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 dark:text-tn-fg bg-gray-100 dark:bg-tn-bg-highlight rounded-xl"
              >
                추가 인증
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-orange-500 rounded-xl"
              >
                홈으로
              </button>
            </div>
          </div>
        )}

        {/* 에러 */}
        {status === "error" && result && (
          <div className="bg-white dark:bg-tn-bg-card rounded-xl p-5 flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-red-100 dark:bg-tn-red/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">😥</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-tn-fg-bright">인증 실패</h3>
            <p className="text-sm text-gray-500 dark:text-tn-fg-dark text-center">{result.error}</p>
            <button
              onClick={() => { setPreview(null); setStatus("idle"); setResult(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="w-full py-2.5 text-sm font-medium text-gray-600 dark:text-tn-fg bg-gray-100 dark:bg-tn-bg-highlight rounded-xl mt-2"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
