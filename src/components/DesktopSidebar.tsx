"use client";

import CategoryFilter from "./CategoryFilter";
import RestaurantList from "./RestaurantList";

export default function DesktopSidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-[380px] border-l border-gray-200 bg-white overflow-hidden">
      <CategoryFilter />
      <div className="flex-1 overflow-y-auto">
        <RestaurantList />
      </div>
    </aside>
  );
}
