"use client";

import BottomSheet from "./BottomSheet";
import SourceTabs from "./SourceTabs";
import CategoryFilter from "./CategoryFilter";
import RestaurantList from "./RestaurantList";

export default function MobileLayout() {
  return (
    <BottomSheet>
      <SourceTabs />
      <CategoryFilter />
      <RestaurantList />
    </BottomSheet>
  );
}
