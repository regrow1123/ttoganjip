import { create } from "zustand";
import type { MapBounds, Restaurant, Category, Source } from "@/types";

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
  sourceFilter: Source;
  isLoading: boolean;
  setRestaurants: (restaurants: Restaurant[]) => void;
  setSelectedId: (id: string | null) => void;
  setCategoryFilter: (category: Category | null) => void;
  setSourceFilter: (source: Source) => void;
  setLoading: (loading: boolean) => void;
}

export const useRestaurantStore = create<RestaurantState>((set) => ({
  restaurants: [],
  selectedId: null,
  categoryFilter: null,
  sourceFilter: "all",
  isLoading: false,
  setRestaurants: (restaurants) => set({ restaurants }),
  setSelectedId: (id) => set({ selectedId: id }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setSourceFilter: (source) => set({ sourceFilter: source }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

interface UserState {
  userId: string | null;
  name: string | null;
  points: number;
  isLoggedIn: boolean;
  setUser: (user: { id: string; name: string; points: number } | null) => void;
  setPoints: (points: number) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  userId: null,
  name: null,
  points: 0,
  isLoggedIn: false,
  setUser: (user) =>
    set(
      user
        ? { userId: user.id, name: user.name, points: user.points, isLoggedIn: true }
        : { userId: null, name: null, points: 0, isLoggedIn: false }
    ),
  setPoints: (points) => set({ points }),
  login: async () => {
    const res = await fetch("/api/auth/demo-login", { method: "POST" });
    const data = await res.json();
    set({ userId: data.id, name: data.name, points: data.points, isLoggedIn: true });
  },
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ userId: null, name: null, points: 0, isLoggedIn: false });
  },
  fetchMe: async () => {
    const res = await fetch("/api/auth/me");
    const { user } = await res.json();
    if (user) {
      set({ userId: user.id, name: user.name, points: user.points, isLoggedIn: true });
    }
  },
}));
