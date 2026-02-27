"use client";

import dynamic from "next/dynamic";

const KakaoMap = dynamic(() => import("@/components/map/KakaoMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-gray-400">지도 로딩 중...</span>
    </div>
  ),
});

export default function MapSection() {
  return <KakaoMap />;
}
