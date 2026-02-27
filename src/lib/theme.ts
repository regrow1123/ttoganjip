"use client";

import { create } from "zustand";

type ThemeMode = "system" | "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: (typeof window !== "undefined" && localStorage.getItem("theme") as ThemeMode) || "system",
  setMode: (mode) => {
    localStorage.setItem("theme", mode);
    set({ mode });
    applyTheme(mode);
  },
}));

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
