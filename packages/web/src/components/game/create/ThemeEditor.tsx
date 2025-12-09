"use client"

import background from "@rahoot/web/assets/background.webp"
import Button from "@rahoot/web/components/Button"
import { useThemeStore } from "@rahoot/web/stores/theme"
import clsx from "clsx"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"

type MediaItem = {
  fileName: string
  url: string
  size: number
  mime: string
  type: string
}

type Props = {
  onBack: () => void
}

const ThemeEditor = ({ onBack }: Props) => {
  const { backgroundUrl, setBackground, reset } = useThemeStore()
  const [customUrl, setCustomUrl] = useState("")
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const previewUrl = useMemo(
    () => backgroundUrl || customUrl || background.src,
    [backgroundUrl, customUrl],
  )

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/media", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load media")
      const onlyImages = (data.media || []).filter(
        (item: MediaItem) => item.mime?.startsWith("image/"),
      )
      setItems(onlyImages)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSet = (url: string) => {
    if (!url) return
    setBackground(url)
  }

  const handleApplyCustom = () => {
    if (!customUrl.trim()) return
    handleSet(customUrl.trim())
  }

  const handleUpload = async (file?: File | null) => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/media", {
        method: "POST",
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Upload failed")
      }
      if (data.media?.url) {
        handleSet(data.media.url)
        setCustomUrl(data.media.url)
      }
      load()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed"
      setUploadError(message)
    } finally {
      setUploading(false)
    }
  }

  const handleReset = () => {
    reset()
    setCustomUrl("")
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="rounded-md bg-gray-700 px-3 py-2 text-white"
        >
          Back
        </button>
        <h2 className="text-xl font-semibold">Theme editor</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">Preview</h3>
          <div className="relative h-60 w-full overflow-hidden rounded-md border border-gray-100 bg-gray-50">
            <Image
              src={previewUrl}
              alt="Background preview"
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <span className="rounded bg-black/50 px-3 py-1 text-sm font-semibold">
                Current background
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="bg-gray-700" onClick={handleReset}>
              Reset to default
            </Button>
            <Button className="bg-primary" onClick={handleApplyCustom}>
              Apply custom URL
            </Button>
          </div>
          <input
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://example.com/background.webp or /media/your-file"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-sm text-gray-600">
            Paste any reachable image URL (including your uploaded media path). Changes apply immediately to the game background.
          </p>
        </div>

        <div className="space-y-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Images from media library</h3>
            <p className="text-sm text-gray-500">Pick any uploaded image as the background.</p>
          </div>
          <Button className="bg-gray-700" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        <div className="rounded-md border border-dashed border-gray-300 p-3">
          <label className="flex items-center gap-3 text-sm font-semibold text-gray-800">
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(e) => handleUpload(e.target.files?.[0])}
              disabled={uploading}
            />
            {uploading ? "Uploading..." : "Upload image"}
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Upload a background image (webp/png/jpg). It will be available immediately and selected as the current background.
          </p>
          {uploadError && (
            <p className="mt-1 text-xs font-semibold text-red-600">{uploadError}</p>
          )}
        </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <button
                key={item.fileName}
                className={clsx(
                  "relative h-32 overflow-hidden rounded-md border border-gray-200 bg-gray-50 text-left shadow-sm transition hover:border-primary",
                  backgroundUrl === item.url && "ring-2 ring-primary",
                )}
                onClick={() => handleSet(item.url)}
              >
                <Image
                  src={item.url}
                  alt={item.fileName}
                  fill
                  className="object-cover"
                  sizes="200px"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0" />
                <div className="absolute bottom-2 left-2 right-2 text-xs font-semibold text-white drop-shadow">
                  {item.fileName}
                </div>
              </button>
            ))}
            {!loading && items.length === 0 && (
              <div className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                No images uploaded yet. Upload an image in the Media page, then pick it here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThemeEditor
