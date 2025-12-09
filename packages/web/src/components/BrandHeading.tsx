"use client"

import { useThemeStore } from "@rahoot/web/stores/theme"
import clsx from "clsx"

type Props = {
  className?: string
  size?: "md" | "lg"
}

const BrandHeading = ({ className, size = "lg" }: Props) => {
  const { brandName } = useThemeStore()
  const label = brandName || "Rahoot!"

  const sizeClass =
    size === "lg"
      ? "text-4xl md:text-5xl lg:text-6xl"
      : "text-2xl md:text-3xl"

  return (
    <div
      className={clsx(
        "text-center font-black tracking-tight text-[#f7931e] drop-shadow-lg leading-tight",
        sizeClass,
        className,
      )}
    >
      {label}
    </div>
  )
}

export default BrandHeading
