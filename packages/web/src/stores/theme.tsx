import { create } from "zustand"
import { persist } from "zustand/middleware"

type ThemeState = {
  backgroundUrl: string | null
  brandName: string | null
  setBackground: (_url: string | null) => void
  setBrandName: (_name: string | null) => void
  reset: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      backgroundUrl: null,
      brandName: null,
      setBackground: (backgroundUrl) => set({ backgroundUrl }),
      setBrandName: (brandName) => set({ brandName }),
      reset: () => set({ backgroundUrl: null, brandName: "KwaQuiz" }),
    }),
    {
      name: "theme-preferences",
    },
  ),
)
