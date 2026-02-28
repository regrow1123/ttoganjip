"use client";

import SourceTabs from "./SourceTabs";
import SearchBar from "./SearchBar";
import CategoryFilter from "./CategoryFilter";
import RestaurantList from "./RestaurantList";

export default function DesktopSidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-[380px] border-l border-ctp-surface0 dark:border-tn-border bg-ctp-base dark:bg-tn-bg overflow-hidden">
      <SearchBar />
      <SourceTabs />
      <CategoryFilter />
      <div className="flex-1 overflow-y-auto">
        <RestaurantList />
      </div>
    </aside>
  );
}
