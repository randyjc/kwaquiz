"use client"

import BrandHeading from "@rahoot/web/components/BrandHeading"
import { PropsWithChildren } from "react"

const BrandShell = ({ children }: PropsWithChildren) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
    <BrandHeading />
    {children}
  </div>
)

export default BrandShell
