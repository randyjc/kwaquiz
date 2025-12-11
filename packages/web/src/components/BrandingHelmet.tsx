"use client"

import { useThemeStore } from "@rahoot/web/stores/theme"
import { useEffect } from "react"

const BrandingHelmet = () => {
  const { brandName } = useThemeStore()
  const fallback = "KwaQuiz"

  useEffect(() => {
    document.title = brandName || fallback
  }, [brandName])

  return null
}

export default BrandingHelmet
