"use client"

import { useEffect } from "react"
import { useThemeStore } from "@rahoot/web/stores/theme"

const ThemeHydrator = () => {
  const { setBackground, setBrandName } = useThemeStore()
  const DEFAULT_BRAND = "KwaQuiz"

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/theme", { cache: "no-store" })
        const data = await res.json()
        if (!res.ok || !data.theme) return

        if (typeof data.theme.backgroundUrl === "string") {
          setBackground(data.theme.backgroundUrl || null)
        }

        const incomingBrand: string | undefined = data.theme.brandName
        if (typeof incomingBrand === "string") {
          setBrandName(incomingBrand.trim())
        } else {
          // no fallback; leave brand empty if server has none
          setBrandName("")
        }
      } catch (error) {
        console.error("Failed to hydrate theme", error)
      }
    }
    load()
  }, [setBackground, setBrandName])

  return null
}

export default ThemeHydrator
