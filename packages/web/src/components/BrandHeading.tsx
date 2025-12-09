"use client"

import { useThemeStore } from "@rahoot/web/stores/theme"
import clsx from "clsx"

type Props = {
  className?: string
}

const BrandHeading = ({ className }: Props) => {
  const { brandName } = useThemeStore()
  const label = brandName || "Rahoot!"

  return (
    <div className={clsx("text-center", className)}>
      <div className="inline-flex rounded-md bg-white/90 px-4 py-2 text-3xl font-black text-[#f7931e] shadow-sm">
        {label}
      </div>
    </div>
  )
}

export default BrandHeading
