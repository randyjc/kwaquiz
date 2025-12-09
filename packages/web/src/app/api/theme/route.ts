import { getTheme, saveTheme } from "@rahoot/web/server/theme"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const theme = getTheme()
    return NextResponse.json({ theme })
  } catch (error) {
    console.error("Failed to load theme", error)
    return NextResponse.json({ error: "Failed to load theme" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const theme = saveTheme({
      brandName: body.brandName,
      backgroundUrl: body.backgroundUrl,
    })
    return NextResponse.json({ theme })
  } catch (error) {
    console.error("Failed to save theme", error)
    const message = error instanceof Error ? error.message : "Failed to save theme"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
