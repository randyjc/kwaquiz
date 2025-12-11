"use client"

import { useEffect } from "react"
import { useThemeStore } from "@rahoot/web/stores/theme"

const ThemeHydrator = () => {
  const { setBackground, setBrandName, setHydrated, brandName, hydrated } =
    useThemeStore()
  const DEFAULT_BRAND = "KwaQuiz"

  useEffect(() => {
    setHydrated(true)
  }, [setHydrated])

  useEffect(() => {
    if (!hydrated) return
    const load = async () => {
      try {
        const res = await fetch("/api/theme", { cache: "no-store" })
        const data = await res.json()
        if (!res.ok || !data.theme) return

        if (typeof data.theme.backgroundUrl === "string") {
          setBackground(data.theme.backgroundUrl || null)
        }

        const incomingBrand = data.theme.brandName
        const hasStoredCustom =
          typeof brandName === "string" &&
          brandName.trim().length > 0 &&
          brandName !== DEFAULT_BRAND

        if (
          typeof incomingBrand === "string" &&
          incomingBrand.trim().length > 0 &&
          !hasStoredCustom
        ) {
          setBrandName(incomingBrand)
        }
      } catch (error) {
        console.error("Failed to hydrate theme", error)
      }
    }
    load()
  }, [setBackground, setBrandName, brandName, hydrated])

  return null
}

export default ThemeHydrator
