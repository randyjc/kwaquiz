import { create } from "zustand"
import { persist } from "zustand/middleware"

type ThemeState = {
  backgroundUrl: string | null
  setBackground: (_url: string | null) => void
  reset: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      backgroundUrl: null,
      setBackground: (backgroundUrl) => set({ backgroundUrl }),
      reset: () => set({ backgroundUrl: null }),
    }),
    { name: "theme-preferences" },
  ),
)
