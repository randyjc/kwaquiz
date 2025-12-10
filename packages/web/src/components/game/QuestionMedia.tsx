"use client"

import type { QuestionMedia as QuestionMediaType } from "@rahoot/common/types/game"
import clsx from "clsx"
import { useEffect, useRef, useState } from "react"

type Props = {
  media?: QuestionMediaType
  alt: string
  onPlayChange?: (_playing: boolean) => void
  playRequest?: number
}

const QuestionMedia = ({ media, alt, onPlayChange, playRequest }: Props) => {
  const [zoomed, setZoomed] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  if (!media) {
    return null
  }

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
        <div className={clsx(containerClass, "px-4")}>
          <audio
            ref={audioRef}
            controls
            crossOrigin="anonymous"
            src={media.url}
            className="mt-4 w-full rounded-md bg-black/40 p-2 shadow-lg"
            preload="none"
            onPlay={() => onPlayChange?.(true)}
            onPause={() => onPlayChange?.(false)}
            onEnded={() => onPlayChange?.(false)}
          />
        </div>
      )

    case "video":
      return (
        <div className={containerClass}>
          <video
            ref={videoRef}
            controls
            crossOrigin="anonymous"
            playsInline
            src={media.url}
            className="m-4 w-full max-w-5xl rounded-md shadow-lg"
            preload="metadata"
            onPlay={() => onPlayChange?.(true)}
            onPause={() => onPlayChange?.(false)}
            onEnded={() => onPlayChange?.(false)}
          />
        </div>
      )

    default:
      return null
  }
}

useEffect(() => {
  if (!media) return
  if (media.type === "audio" && audioRef.current && playRequest !== undefined) {
    audioRef.current.play().catch(() => {})
  }
  if (media.type === "video" && videoRef.current && playRequest !== undefined) {
    videoRef.current.play().catch(() => {})
  }
}, [playRequest, media])

export default QuestionMedia
