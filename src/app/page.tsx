import Header from "@/components/Header";
import CategoryFilter from "@/components/CategoryFilter";
import RestaurantList from "@/components/RestaurantList";
import MapSection from "@/components/map/MapSection";

export default function Home() {
  return (
    <div className="flex flex-col h-dvh">
      <Header />

      {/* 모바일: 지도 위 + 리스트 아래 스크롤 / 데스크탑: 좌우 분할 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 지도 영역 */}
        <div className="flex-1 relative">
          <MapSection />
        </div>

        {/* 사이드패널 (데스크탑) / 바텀시트 (모바일) */}
        <aside className="w-full md:w-[380px] md:border-l border-gray-200 bg-white overflow-y-auto absolute bottom-0 left-0 right-0 md:relative md:bottom-auto max-h-[50dvh] md:max-h-none rounded-t-2xl md:rounded-none shadow-lg md:shadow-none">
          <CategoryFilter />
          <RestaurantList />
        </aside>
      </div>
    </div>
  );
}
