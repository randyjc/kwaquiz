"use client"

import { useEffect } from "react"
import { useThemeStore } from "@rahoot/web/stores/theme"

const ThemeHydrator = () => {
  const { setBackground, setBrandName, brandName, hydrated } = useThemeStore()
  const DEFAULT_BRAND = "KwaQuiz"

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

        const incomingBrand: string | undefined = data.theme.brandName
        const hasLocal =
          typeof brandName === "string" && brandName.trim().length > 0

        if (typeof incomingBrand === "string" && incomingBrand.trim().length > 0) {
          const trimmed = incomingBrand.trim()
          // Prefer the locally persisted brand if it exists; only apply server brand
          // when we don't have one locally or when the server brand is non-default.
          if (!hasLocal || (trimmed !== DEFAULT_BRAND && trimmed !== brandName)) {
            setBrandName(trimmed)
          }
        } else if (!hasLocal) {
          setBrandName(DEFAULT_BRAND)
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
