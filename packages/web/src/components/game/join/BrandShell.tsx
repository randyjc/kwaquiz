"use client"

import { PropsWithChildren } from "react"

const BrandShell = ({ children }: PropsWithChildren) => (
  <div className="flex w-full max-w-xl flex-col items-center justify-center gap-4">
    {children}
  </div>
)

export default BrandShell
