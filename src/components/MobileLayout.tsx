"use client";

import BottomSheet from "./BottomSheet";
import SearchBar from "./SearchBar";
import SourceTabs from "./SourceTabs";
import CategoryFilter from "./CategoryFilter";
import RestaurantList from "./RestaurantList";

export default function MobileLayout() {
  return (
    <BottomSheet>
      <SearchBar />
      <SourceTabs />
      <CategoryFilter />
      <RestaurantList />
    </BottomSheet>
  );
}
