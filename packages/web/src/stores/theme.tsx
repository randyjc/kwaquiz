import { create } from "zustand"
import { persist } from "zustand/middleware"

type ThemeState = {
  backgroundUrl: string | null
  brandName: string | null
  hydrated: boolean
  setBackground: (_url: string | null) => void
  setBrandName: (_name: string | null) => void
  setHydrated: (_hydrated: boolean) => void
  reset: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      backgroundUrl: null,
      brandName: null,
      hydrated: false,
      setBackground: (backgroundUrl) => set({ backgroundUrl }),
      setBrandName: (brandName) => set({ brandName }),
      setHydrated: (hydrated) => set({ hydrated }),
      reset: () => set({ backgroundUrl: null, brandName: null }),
    }),
    {
      name: "theme-preferences",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated?.(true)
      },
    },
  ),
)
