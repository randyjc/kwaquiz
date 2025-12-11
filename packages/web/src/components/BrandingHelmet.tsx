"use client"

import { useThemeStore } from "@rahoot/web/stores/theme"
import { useEffect, useRef } from "react"

const BrandingHelmet = () => {
  const { brandName } = useThemeStore()
  const initialTitle = useRef<string | null>(null)

  useEffect(() => {
    if (initialTitle.current === null) {
      initialTitle.current = document.title
    }
    const next =
      typeof brandName === "string"
        ? brandName || initialTitle.current || document.title
        : initialTitle.current || document.title
    document.title = next
  }, [brandName])

  return null
}

export default BrandingHelmet
