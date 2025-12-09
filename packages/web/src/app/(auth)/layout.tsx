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

  if (!isConnected) {
    return (
      <section className="relative flex min-h-screen flex-col items-center justify-center">
        <div className="pointer-events-none absolute h-full w-full overflow-hidden">
          <div className="bg-primary/15 absolute -top-[15vmin] -left-[15vmin] min-h-[75vmin] min-w-[75vmin] rounded-full"></div>
        <div className="bg-primary/15 absolute -right-[15vmin] -bottom-[15vmin] min-h-[75vmin] min-w-[75vmin] rotate-45"></div>
      </div>

        <BrandHeading className="mb-6" size="lg" />
        <Loader className="h-23" />
        <h2 className="mt-2 text-center text-2xl font-bold text-white drop-shadow-lg md:text-3xl">
          Loading...
        </h2>
      </section>
    )
  }

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center">
      <div className="pointer-events-none absolute h-full w-full overflow-hidden">
        <div className="bg-primary/15 absolute -top-[15vmin] -left-[15vmin] min-h-[75vmin] min-w-[75vmin] rounded-full"></div>
        <div className="bg-primary/15 absolute -right-[15vmin] -bottom-[15vmin] min-h-[75vmin] min-w-[75vmin] rotate-45"></div>
      </div>

      <BrandHeading className="mb-6" size="lg" />
      {children}
    </section>
  )
}

export default AuthLayout
