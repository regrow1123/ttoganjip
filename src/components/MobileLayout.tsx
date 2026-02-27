"use client";

import BottomSheet from "./BottomSheet";
import CategoryFilter from "./CategoryFilter";
import RestaurantList from "./RestaurantList";

export default function MobileLayout() {
  return (
    <BottomSheet>
      <CategoryFilter />
      <RestaurantList />
    </BottomSheet>
  );
}
