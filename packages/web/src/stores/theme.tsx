import { create } from "zustand"
import { persist } from "zustand/middleware"

type ThemeState = {
  backgroundUrl: string | null
  brandName: string
  hydrated: boolean
  setBackground: (_url: string | null) => void
  setBrandName: (_name: string) => void
  setHydrated: (_hydrated: boolean) => void
  reset: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      backgroundUrl: null,
      brandName: "KwaQuiz",
      hydrated: true,
      setBackground: (backgroundUrl) => set({ backgroundUrl }),
      setBrandName: (brandName) => set({ brandName }),
      setHydrated: (hydrated) => set({ hydrated }),
      reset: () => set({ backgroundUrl: null, brandName: "KwaQuiz" }),
    }),
    {
      name: "theme-preferences",
      // Hydrated defaults to true to avoid overwriting with defaults on load.
    },
  ),
)
