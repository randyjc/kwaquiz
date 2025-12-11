import { create } from "zustand"
import { persist } from "zustand/middleware"

type ThemeState = {
  backgroundUrl: string | null
  brandName: string
  hydrated: boolean
  setBackground: (_url: string | null) => void
  setBrandName: (_name: string) => void
  reset: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      backgroundUrl: null,
      brandName: "KwaQuiz",
      hydrated: false,
      setBackground: (backgroundUrl) => set({ backgroundUrl }),
      setBrandName: (brandName) => set({ brandName }),
      reset: () => set({ backgroundUrl: null, brandName: "KwaQuiz" }),
    }),
    {
      name: "theme-preferences",
      onRehydrateStorage: () => () => set({ hydrated: true }),
    },
  ),
)
