"use client"

import type { QuestionMedia as QuestionMediaType } from "@rahoot/common/types/game"
import clsx from "clsx"
import { useEffect, useRef, useState } from "react"

type Props = {
  media?: QuestionMediaType
  alt: string
  onPlayChange?: (_playing: boolean) => void
  autoPlayAfterMs?: number
}

const QuestionMedia = ({ media, alt, onPlayChange, autoPlayAfterMs }: Props) => {
  const [zoomed, setZoomed] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!media) return
    if (media.type !== "audio" && media.type !== "video") return
    if (autoPlayAfterMs === undefined) return

    const timer = setTimeout(() => {
      setStarting(true)
      const el = media.type === "audio" ? audioRef.current : videoRef.current
      el?.play().catch(() => {
        /* ignore autoplay rejection */
        setStarting(false)
      })
    }, autoPlayAfterMs)

    return () => clearTimeout(timer)
  }, [media, autoPlayAfterMs])

  if (!media) return null

  const containerClass = "mx-auto flex w-full max-w-5xl justify-center"

  switch (media.type) {
    case "image":
      return (
        <>
          <div className={containerClass}>
            <img
              alt={alt}
              src={media.url}
              className="m-4 h-full max-h-[400px] min-h-[200px] w-auto max-w-full cursor-zoom-in rounded-md object-contain shadow-lg"
              onClick={() => setZoomed(true)}
            />
          </div>
          {zoomed && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
              onClick={() => setZoomed(false)}
            >
              <img
                src={media.url}
                alt={alt}
                className="max-h-[90vh] max-w-[90vw] rounded-md shadow-2xl"
              />
            </div>
          )}
        </>
      )

    case "audio":
      return (
        <div className={clsx(containerClass, "px-4 flex flex-col items-center")}>
          {starting && (
            <div className="mb-2 rounded-full bg-black/70 px-4 py-1 text-xs font-semibold text-white shadow">
              Starting playback…
            </div>
          )}
          <audio
            ref={audioRef}
            controls
            crossOrigin="anonymous"
            src={media.url}
            className="mt-2 w-full rounded-md bg-black/40 p-2 shadow-lg"
            preload="auto"
            onPlay={() => {
              setStarting(false)
              onPlayChange?.(true)
            }}
            onPause={() => onPlayChange?.(false)}
            onEnded={() => onPlayChange?.(false)}
          />
        </div>
      )

    case "video":
      return (
        <div className={clsx(containerClass, "flex flex-col items-center")}>
          {starting && (
            <div className="mb-2 rounded-full bg-black/70 px-4 py-1 text-xs font-semibold text-white shadow">
              Starting playback…
            </div>
          )}
          <video
            ref={videoRef}
            controls
            crossOrigin="anonymous"
            playsInline
            src={media.url}
            className="m-4 w-full max-w-5xl rounded-md shadow-lg"
            preload="auto"
            onPlay={() => {
              setStarting(false)
              onPlayChange?.(true)
            }}
            onPause={() => onPlayChange?.(false)}
            onEnded={() => onPlayChange?.(false)}
          />
        </div>
      )

    default:
      return null
  }
}

export default QuestionMedia
