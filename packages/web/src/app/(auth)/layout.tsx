"use client"

import BrandHeading from "@rahoot/web/components/BrandHeading"
import Loader from "@rahoot/web/components/Loader"
import { useSocket } from "@rahoot/web/contexts/socketProvider"
import { PropsWithChildren, useEffect } from "react"

const AuthLayout = ({ children }: PropsWithChildren) => {
  const { isConnected, connect } = useSocket()
  useEffect(() => {
    if (!isConnected) {
      connect()
    }
  }, [connect, isConnected])

  const Shell = ({ children: inner }: PropsWithChildren) => (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-primary/15 absolute -top-[15vmin] -left-[15vmin] min-h-[75vmin] min-w-[75vmin] rounded-full" />
        <div className="bg-primary/15 absolute -right-[15vmin] -bottom-[15vmin] min-h-[75vmin] min-w-[75vmin] rotate-45" />
      </div>

      <div className="z-10 flex w-full max-w-xl flex-col items-center gap-4">
        <BrandHeading size="md" />
        {inner}
      </div>
    </section>
  )

  if (!isConnected) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3">
          <Loader className="h-23" />
          <h2 className="text-2xl font-bold text-white drop-shadow-lg md:text-3xl">
            Loading...
          </h2>
        </div>
      </Shell>
    )
  }

  return <Shell>{children}</Shell>
}

export default AuthLayout
