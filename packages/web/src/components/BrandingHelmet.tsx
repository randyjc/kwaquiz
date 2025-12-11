"use client"

import { useThemeStore } from "@rahoot/web/stores/theme"
import { useEffect } from "react"

const BrandingHelmet = () => {
  const { brandName } = useThemeStore()
  const fallback = "KwaQuiz"

  useEffect(() => {
    const title =
      typeof brandName === "string" && brandName.trim().length > 0
        ? brandName
        : fallback
    document.title = title
  }, [brandName])

  return null
}

export default BrandingHelmet
