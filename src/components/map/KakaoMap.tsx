"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMapStore, useRestaurantStore } from "@/lib/store";
import { fetchRestaurants } from "@/lib/api";

declare global {
  interface Window {
    kakao: any;
  }
}

export default function KakaoMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const { setBounds, setCenter, setLevel } = useMapStore();
  const { setRestaurants, setLoading, categoryFilter, sourceFilter } = useRestaurantStore();

  const loadRestaurants = useCallback(
    async (bounds: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } }) => {
      setLoading(true);
      try {
        const data = await fetchRestaurants(bounds, categoryFilter, sourceFilter);
        setRestaurants(data.restaurants);
      } catch (err) {
        console.error("Failed to load restaurants:", err);
      } finally {
        setLoading(false);
      }
    },
    [categoryFilter, sourceFilter, setRestaurants, setLoading]
  );

  useEffect(() => {
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => {
        if (!mapRef.current) return;

        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.978),
          level: 5,
        };

        const kakaoMap = new window.kakao.maps.Map(mapRef.current, options);
        mapInstance.current = kakaoMap;

        // 지도 이동 완료 시 데이터 로드
        let debounceTimer: NodeJS.Timeout;
        window.kakao.maps.event.addListener(kakaoMap, "idle", () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const bounds = kakaoMap.getBounds();
            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            const center = kakaoMap.getCenter();

            const boundsObj = {
              sw: { lat: sw.getLat(), lng: sw.getLng() },
              ne: { lat: ne.getLat(), lng: ne.getLng() },
            };

            setBounds(boundsObj);
            setCenter({ lat: center.getLat(), lng: center.getLng() });
            setLevel(kakaoMap.getLevel());
            loadRestaurants(boundsObj);
          }, 300);
        });

        // 초기 로드
        setTimeout(() => {
          const bounds = kakaoMap.getBounds();
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          loadRestaurants({
            sw: { lat: sw.getLat(), lng: sw.getLng() },
            ne: { lat: ne.getLat(), lng: ne.getLng() },
          });
        }, 500);
      });
    };

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [setBounds, setCenter, setLevel, loadRestaurants]);

  // 카테고리 필터 변경 시 다시 로드
  useEffect(() => {
    if (!mapInstance.current) return;
    const bounds = mapInstance.current.getBounds();
    if (!bounds) return;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    loadRestaurants({
      sw: { lat: sw.getLat(), lng: sw.getLng() },
      ne: { lat: ne.getLat(), lng: ne.getLng() },
    });
  }, [categoryFilter, sourceFilter, loadRestaurants]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ minHeight: "100%" }}
    />
  );
}
