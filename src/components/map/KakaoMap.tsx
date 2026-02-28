"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMapStore, useRestaurantStore } from "@/lib/store";
import { fetchRestaurants } from "@/lib/api";
import type { Restaurant } from "@/types";

declare global {
  interface Window {
    kakao: any;
  }
}

export default function KakaoMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const { setBounds, setCenter, setLevel } = useMapStore();
  const { restaurants, setRestaurants, setLoading, setSelectedId, categoryFilter, sourceFilter, searchQuery, searchDbResults } =
    useRestaurantStore();

  // 마커 전부 제거
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    overlaysRef.current.forEach((o) => o.setMap(null));
    markersRef.current = [];
    overlaysRef.current = [];
  }, []);

  // 잠금 해제된 식당만 마커 표시
  const renderMarkers = useCallback(
    (items: Restaurant[]) => {
      if (!mapInstance.current || !window.kakao) return;
      clearMarkers();

      const unlocked = items.filter((r) => !r.locked && "location" in r);

      unlocked.forEach((r, idx) => {
        if (r.locked || !("location" in r)) return;

        const position = new window.kakao.maps.LatLng(r.location.lat, r.location.lng);
        const num = idx + 1;

        // 번호 핀 오버레이
        const content = document.createElement("div");
        content.className = "kakao-pin-overlay";
        content.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          ">
            <div style="
              background: #FF6B35;
              color: white;
              width: 30px;
              height: 30px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
            ">
              <span style="
                transform: rotate(45deg);
                font-size: 12px;
                font-weight: 700;
                line-height: 1;
              ">${num}</span>
            </div>
          </div>
        `;

        content.addEventListener("click", () => {
          setSelectedId(r.id);
        });

        const overlay = new window.kakao.maps.CustomOverlay({
          position,
          content,
          yAnchor: 1.3,
        });

        overlay.setMap(mapInstance.current);
        overlaysRef.current.push(overlay);
      });
    },
    [clearMarkers, setSelectedId]
  );

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
    return () => { script.remove(); };
  }, [setBounds, setCenter, setLevel, loadRestaurants]);

  // restaurants 또는 검색어 변경 시 마커 업데이트
  useEffect(() => {
    // 검색 API 모드: DB 검색 결과를 핀으로 표시
    if (searchQuery.length >= 2 && searchDbResults.length > 0) {
      const searchItems = searchDbResults
        .filter((r) => r.lat && r.lng)
        .map((r, idx) => ({
          id: r.id,
          name: r.name,
          address: r.address,
          location: { lat: r.lat!, lng: r.lng! },
          revisitScore: r.totalVisits,
          locked: false as const,
        }));
      renderMarkers(searchItems as any);
      return;
    }

    if (!searchQuery) {
      renderMarkers(restaurants);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = restaurants.filter((r) => {
      if (!r.locked && "name" in r) {
        return r.name.toLowerCase().includes(q) || r.address?.toLowerCase().includes(q);
      }
      if (r.locked && "areaHint" in r) {
        return r.areaHint?.toLowerCase().includes(q);
      }
      return false;
    });
    renderMarkers(filtered);
  }, [restaurants, searchQuery, searchDbResults, renderMarkers]);

  // 필터 변경 시 다시 로드
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
      className="w-full h-full kakao-map-container"
      style={{ minHeight: "100%" }}
    />
  );
}
