"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Tesseract from "tesseract.js";

type Status = "idle" | "ocr" | "matching" | "success" | "error";

interface VerifyResult {
  success?: boolean;
  restaurant?: string;
  isFirstVisit?: boolean;
  pointsEarned?: number;
  totalPoints?: number;
  error?: string;
}

export default function ReceiptPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const handleFile = (file: File) => {
    setPreview(URL.createObjectURL(file));
    setStatus("idle");
    setResult(null);
  };

  const handleVerify = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    // 1) 브라우저 OCR
    setStatus("ocr");
    setOcrProgress(0);

    let ocrText = "";
    try {
      const result = await Tesseract.recognize(file, "kor+eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round((m.progress || 0) * 100));
          }
        },
      });
      ocrText = result.data.text;
    } catch {
      setStatus("error");
      setResult({ error: "영수증 텍스트 인식에 실패했습니다" });
      return;
    }

    if (!ocrText || ocrText.trim().length < 5) {
      setStatus("error");
      setResult({ error: "영수증에서 텍스트를 읽을 수 없습니다. 더 선명한 사진을 올려주세요." });
      return;
    }

    // 2) 서버 매칭
    setStatus("matching");
    try {
      const res = await fetch("/api/receipts/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocrText }),
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

  const reset = () => {
    setPreview(null);
    setStatus("idle");
    setResult(null);
    setOcrProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="min-h-dvh bg-ctp-mantle dark:bg-tn-bg">
      <header className="bg-ctp-base dark:bg-tn-bg border-b border-ctp-surface0 dark:border-tn-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="text-ctp-subtext dark:text-tn-fg-dark hover:text-ctp-text">←</button>
        <h1 className="text-base font-bold text-ctp-text dark:text-tn-fg-bright">📸 영수증 인증</h1>
      </header>

      <div className="p-4 flex flex-col gap-4 max-w-md mx-auto">
        {/* 안내 */}
        <div className="bg-blue-50 dark:bg-tn-blue/10 rounded-xl p-4">
          <h2 className="text-sm font-bold text-tn-blue dark:text-tn-blue mb-1">방문 인증하고 포인트 받기!</h2>
          <p className="text-xs text-ctp-subtext dark:text-tn-fg-dark leading-relaxed">
            식당 영수증을 촬영하면 자동으로 식당을 인식해요.<br />
            첫 방문 <b>+10P</b>, 재방문 <b>+20P</b>!
          </p>
        </div>

        {/* 업로드 영역 */}
        <div
          onClick={() => status === "idle" && fileRef.current?.click()}
          className={`bg-ctp-base dark:bg-tn-bg-card border-2 border-dashed border-ctp-surface0 dark:border-tn-border rounded-xl p-8 flex flex-col items-center gap-3 transition ${
            status === "idle" ? "cursor-pointer hover:border-tn-blue" : ""
          }`}
        >
          {preview ? (
            <img src={preview} alt="영수증" className="max-h-64 rounded-lg object-contain" />
          ) : (
            <>
              <span className="text-4xl">📸</span>
              <p className="text-sm text-ctp-overlay dark:text-tn-fg-dark">영수증 촬영 또는 갤러리에서 선택</p>
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
        {preview && status === "idle" && (
          <button onClick={handleVerify} className="w-full py-3 text-sm font-bold text-white bg-tn-blue rounded-xl hover:bg-blue-600 transition">
            🔍 영수증 인증하기
          </button>
        )}

        {/* OCR 진행 */}
        {status === "ocr" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-8 h-8 border-3 border-tn-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-ctp-subtext dark:text-tn-fg-dark">영수증 텍스트 인식 중... {ocrProgress}%</p>
            <div className="w-full bg-ctp-surface0 dark:bg-tn-bg-highlight rounded-full h-1.5">
              <div className="bg-tn-blue h-1.5 rounded-full transition-all" style={{ width: `${ocrProgress}%` }} />
            </div>
          </div>
        )}

        {/* 매칭 중 */}
        {status === "matching" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-8 h-8 border-3 border-tn-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-ctp-subtext dark:text-tn-fg-dark">식당 매칭 중...</p>
          </div>
        )}

        {/* 성공 */}
        {status === "success" && result && (
          <div className="bg-ctp-base dark:bg-tn-bg-card rounded-xl p-5 flex flex-col items-center gap-3 animate-slide-up">
            <div className="w-16 h-16 bg-green-100 dark:bg-tn-green/10 rounded-full flex items-center justify-center animate-bounce-once">
              <span className="text-3xl">🎉</span>
            </div>
            <h3 className="text-base font-bold text-ctp-text dark:text-tn-fg-bright">인증 성공!</h3>
            <p className="text-sm text-ctp-subtext dark:text-tn-fg">
              <span className="font-bold text-tn-blue">{result.restaurant}</span>
              {result.isFirstVisit ? " 첫 방문" : " 재방문"}
            </p>
            <div className="bg-blue-50 dark:bg-tn-blue/10 rounded-lg px-4 py-2">
              <span className="text-lg font-bold text-tn-blue">+{result.pointsEarned}P</span>
            </div>
            <p className="text-xs text-ctp-overlay dark:text-tn-fg-dark">보유 포인트: {result.totalPoints}P</p>
            <div className="flex gap-2 w-full mt-2">
              <button onClick={reset} className="flex-1 py-2.5 text-sm font-medium text-ctp-subtext dark:text-tn-fg bg-ctp-mantle dark:bg-tn-bg-highlight rounded-xl">
                추가 인증
              </button>
              <button onClick={() => router.push("/")} className="flex-1 py-2.5 text-sm font-bold text-white bg-tn-blue rounded-xl">
                홈으로
              </button>
            </div>
          </div>
        )}

        {/* 에러 */}
        {status === "error" && result && (
          <div className="bg-ctp-base dark:bg-tn-bg-card rounded-xl p-5 flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-red-100 dark:bg-tn-red/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">😥</span>
            </div>
            <h3 className="text-base font-bold text-ctp-text dark:text-tn-fg-bright">인증 실패</h3>
            <p className="text-sm text-ctp-subtext dark:text-tn-fg-dark text-center">{result.error}</p>
            <button onClick={reset} className="w-full py-2.5 text-sm font-medium text-ctp-subtext dark:text-tn-fg bg-ctp-mantle dark:bg-tn-bg-highlight rounded-xl mt-2">
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
