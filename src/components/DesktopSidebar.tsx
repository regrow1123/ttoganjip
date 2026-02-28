"use client";

import SourceTabs from "./SourceTabs";
import CategoryFilter from "./CategoryFilter";
import RestaurantList from "./RestaurantList";

export default function DesktopSidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-[380px] border-l border-gray-200 dark:border-tn-border bg-white dark:bg-tn-bg overflow-hidden">
      <SourceTabs />
      <CategoryFilter />
      <div className="flex-1 overflow-y-auto">
        <RestaurantList />
      </div>
    </aside>
  );
}
