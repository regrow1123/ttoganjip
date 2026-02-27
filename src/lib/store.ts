import { create } from "zustand";
import type { MapBounds, Restaurant, Category } from "@/types";

interface MapState {
  bounds: MapBounds | null;
  center: { lat: number; lng: number };
  level: number;
  setBounds: (bounds: MapBounds) => void;
  setCenter: (center: { lat: number; lng: number }) => void;
  setLevel: (level: number) => void;
}

export const useMapStore = create<MapState>((set) => ({
  bounds: null,
  center: { lat: 37.5665, lng: 126.978 },
  level: 5,
  setBounds: (bounds) => set({ bounds }),
  setCenter: (center) => set({ center }),
  setLevel: (level) => set({ level }),
}));

interface RestaurantState {
  restaurants: Restaurant[];
  selectedId: string | null;
  categoryFilter: Category | null;
  isLoading: boolean;
  setRestaurants: (restaurants: Restaurant[]) => void;
  setSelectedId: (id: string | null) => void;
  setCategoryFilter: (category: Category | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useRestaurantStore = create<RestaurantState>((set) => ({
  restaurants: [],
  selectedId: null,
  categoryFilter: null,
  isLoading: false,
  setRestaurants: (restaurants) => set({ restaurants }),
  setSelectedId: (id) => set({ selectedId: id }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

interface UserState {
  points: number;
  isLoggedIn: boolean;
  setPoints: (points: number) => void;
  setLoggedIn: (loggedIn: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  points: 0,
  isLoggedIn: false,
  setPoints: (points) => set({ points }),
  setLoggedIn: (loggedIn) => set({ isLoggedIn: loggedIn }),
}));
