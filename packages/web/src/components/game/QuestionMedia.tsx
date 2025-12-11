"use client"

import type { QuestionMedia as QuestionMediaType } from "@rahoot/common/types/game"
import clsx from "clsx"
import { useEffect, useRef, useState } from "react"

type Props = {
  media?: QuestionMediaType
  alt: string
  onPlayChange?: (_playing: boolean) => void
  autoPlayCountdownSeconds?: number
}

const QuestionMedia = ({
  media,
  alt,
  onPlayChange,
  autoPlayCountdownSeconds,
}: Props) => {
  const [zoomed, setZoomed] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    if (!media) return
    if (media.type !== "audio" && media.type !== "video") return
    if (autoPlayCountdownSeconds === undefined) return

    setCountdown(autoPlayCountdownSeconds)
    let remaining = autoPlayCountdownSeconds
    const timer = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(timer)
        setCountdown(null)
        const el = media.type === "audio" ? audioRef.current : videoRef.current
        el?.play().catch(() => {
          /* ignore autoplay rejection */
        })
      } else {
        setCountdown(remaining)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [media, autoPlayCountdownSeconds])

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
        <div
          className={clsx(
            containerClass,
            "relative flex flex-col items-center px-4",
          )}
        >
          {countdown !== null && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="rounded-full bg-black/70 px-6 py-3 text-3xl font-extrabold text-white shadow-lg">
                {countdown}
              </div>
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
              onPlayChange?.(true)
            }}
            onPause={() => onPlayChange?.(false)}
            onEnded={() => onPlayChange?.(false)}
          />
        </div>
      )

    case "video":
      return (
        <div className={clsx(containerClass, "relative flex flex-col items-center")}>
          {countdown !== null && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="rounded-full bg-black/70 px-6 py-3 text-3xl font-extrabold text-white shadow-lg">
                {countdown}
              </div>
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
