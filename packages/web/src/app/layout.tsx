import Toaster from "@rahoot/web/components/Toaster"
import BrandingHelmet from "@rahoot/web/components/BrandingHelmet"
import ThemeHydrator from "@rahoot/web/components/ThemeHydrator"
import { SocketProvider } from "@rahoot/web/contexts/socketProvider"
import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import { PropsWithChildren } from "react"
import "./globals.css"
import { getTheme } from "@rahoot/web/server/theme"

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
})

export async function generateMetadata(): Promise<Metadata> {
  const theme = getTheme()
  return {
    title: theme.brandName || "Rahoot",
    icons: "/icon.svg",
  }
}

const RootLayout = ({ children }: PropsWithChildren) => (
  <html lang="en" suppressHydrationWarning={true} data-lt-installed="true">
    <body className={`${montserrat.variable} bg-secondary antialiased`}>
      <SocketProvider>
        <BrandingHelmet />
        <ThemeHydrator />
        <main className="text-base-[8px] flex flex-col">{children}</main>
        <Toaster />
      </SocketProvider>
    </body>
  </html>
)

export default RootLayout
