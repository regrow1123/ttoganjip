import Header from "@/components/Header";
import CategoryFilter from "@/components/CategoryFilter";
import RestaurantList from "@/components/RestaurantList";
import MapSection from "@/components/map/MapSection";
import MobileLayout from "@/components/MobileLayout";
import DesktopSidebar from "@/components/DesktopSidebar";

export default function Home() {
  return (
    <div className="flex flex-col h-dvh">
      <Header />

      <div className="flex flex-1 overflow-hidden relative">
        {/* 지도 — 항상 전체 */}
        <div className="flex-1">
          <MapSection />
        </div>

        {/* 데스크탑: 사이드패널 */}
        <DesktopSidebar />

        {/* 모바일: 바텀시트 */}
        <MobileLayout />
      </div>
    </div>
  );
}
