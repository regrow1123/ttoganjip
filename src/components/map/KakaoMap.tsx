"use client";

import { useEffect, useRef, useState } from "react";
import { useMapStore } from "@/lib/store";

declare global {
  interface Window {
    kakao: any;
  }
}

export default function KakaoMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const { setBounds, setCenter, setLevel } = useMapStore();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => {
        if (!mapRef.current) return;

        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.978), // 서울 시청
          level: 5,
        };

        const kakaoMap = new window.kakao.maps.Map(mapRef.current, options);
        setMap(kakaoMap);

        // 지도 이동 시 bounds 업데이트
        window.kakao.maps.event.addListener(kakaoMap, "idle", () => {
          const bounds = kakaoMap.getBounds();
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          const center = kakaoMap.getCenter();

          setBounds({
            sw: { lat: sw.getLat(), lng: sw.getLng() },
            ne: { lat: ne.getLat(), lng: ne.getLng() },
          });
          setCenter({ lat: center.getLat(), lng: center.getLng() });
          setLevel(kakaoMap.getLevel());
        });
      });
    };

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [setBounds, setCenter, setLevel]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ minHeight: "100dvh" }}
    />
  );
}
