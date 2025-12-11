"use client"

import { useThemeStore } from "@rahoot/web/stores/theme"
import { useEffect } from "react"

const BrandingHelmet = () => {
  const { brandName } = useThemeStore()
  const fallback = "KwaQuiz"

  useEffect(() => {
    document.title = (brandName && brandName.trim().length > 0 ? brandName : fallback) as string
  }, [brandName])

  return null
}

export default BrandingHelmet
