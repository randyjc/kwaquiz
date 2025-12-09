"use client"

import { PropsWithChildren } from "react"

const BrandShell = ({ children }: PropsWithChildren) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
    {children}
  </div>
)

export default BrandShell
