"use client"

import type { QuestionMedia as QuestionMediaType } from "@rahoot/common/types/game"
import clsx from "clsx"
import { useEffect, useRef, useState } from "react"

type Props = {
  media?: QuestionMediaType
  alt: string
  onPlayChange?: (_playing: boolean) => void
  playRequest?: { nonce: number; startAt: number }
  requireUserEnable?: boolean
}

const STORAGE_KEY = "kwaquiz-autoplay-enabled"
let audioCtx: AudioContext | null = null
let globalUnlocked = false

const QuestionMedia = ({
  media,
  alt,
  onPlayChange,
  playRequest,
  requireUserEnable,
}: Props) => {
  const [zoomed, setZoomed] = useState(false)
  const [autoplayReady, setAutoplayReady] = useState(false)
  const [promptEnable, setPromptEnable] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastNonce = useRef<number>(0)
  const playTimer = useRef<NodeJS.Timeout | null>(null)
  const fallbackTimer = useRef<NodeJS.Timeout | null>(null)
  const pendingRequest = useRef<typeof playRequest | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.sessionStorage.getItem(STORAGE_KEY)
    if (stored === "true" && globalUnlocked) {
      setAutoplayReady(true)
    } else if (requireUserEnable) {
      setAutoplayReady(false)
      setPromptEnable(true)
    }
  }, [requireUserEnable])

  const ensureUnlocked = async () => {
    if (typeof window === "undefined" || globalUnlocked) return
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      if (audioCtx.state === "suspended") {
        await audioCtx.resume()
      }
      // play a silent audio to keep gesture active for this page
      const silent = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=")
      silent.muted = true
      await silent.play().catch(() => {})
      globalUnlocked = true
    } catch {
      // ignore
    }
  }

  const primeAutoplay = async () => {
    await ensureUnlocked()
    setAutoplayReady(true)
    setPromptEnable(false)
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, "true")
    }

    const el =
      media?.type === "audio"
        ? audioRef.current
        : media?.type === "video"
          ? videoRef.current
          : null
    if (!el) return
    try {
      el.muted = true
      await el.play()
      el.pause()
      el.currentTime = 0
    } catch {
      // ignore
    } finally {
      setTimeout(() => {
        if (el) el.muted = false
      }, 150)
    }

    if (pendingRequest.current && media) {
      runPlay(pendingRequest.current, media)
    }
  }

  const runPlay = (request: { nonce: number; startAt: number }, currentMedia: QuestionMediaType) => {
    const { nonce, startAt } = request
    // avoid replay unless we re-prompted
    if (nonce === lastNonce.current && !promptEnable) return

    if (playTimer.current) {
      clearTimeout(playTimer.current)
      playTimer.current = null
    }
    if (fallbackTimer.current) {
      clearTimeout(fallbackTimer.current)
      fallbackTimer.current = null
    }

    const tryPlay = async (el: HTMLMediaElement | null) => {
      if (!el) return
      try {
        await ensureUnlocked()
        el.pause()
        el.currentTime = 0
        await el.play()
        lastNonce.current = nonce
        pendingRequest.current = null
      } catch {
        try {
          el.muted = true
          el.pause()
          el.currentTime = 0
          await el.play()
          setTimeout(() => {
            el.muted = false
          }, 150)
          lastNonce.current = nonce
          pendingRequest.current = null
        } catch {
          // Autoplay blocked. Force prompt and reset readiness so user can re-allow.
          if (requireUserEnable) {
            setAutoplayReady(false)
            setPromptEnable(true)
            pendingRequest.current = request
            lastNonce.current = 0
          }
        }
      }
    }

    pendingRequest.current = request
    const delay = Math.max(0, startAt - Date.now())
    playTimer.current = setTimeout(() => {
      playTimer.current = null
      if (currentMedia.type === "audio") {
        tryPlay(audioRef.current)
      } else if (currentMedia.type === "video") {
        tryPlay(videoRef.current)
      }
    }, delay)

    // fallback: if still stalled shortly after start time, re-show consent
    fallbackTimer.current = setTimeout(() => {
      const el =
        currentMedia.type === "audio"
          ? audioRef.current
          : currentMedia.type === "video"
            ? videoRef.current
            : null
      if (!el) return
      const stalled = el.paused || el.currentTime === 0
      if (stalled && requireUserEnable) {
        setAutoplayReady(false)
        setPromptEnable(true)
        pendingRequest.current = request
        lastNonce.current = 0
      }
    }, delay + 2000)
  }

  useEffect(() => {
    if (!media || !playRequest) return
    pendingRequest.current = playRequest
    if (requireUserEnable && !autoplayReady && (media.type === "audio" || media.type === "video")) {
      setPromptEnable(true)
      return
    }
    runPlay(playRequest, media)

    return () => {
      if (playTimer.current) {
        clearTimeout(playTimer.current)
        playTimer.current = null
      }
      if (fallbackTimer.current) {
        clearTimeout(fallbackTimer.current)
        fallbackTimer.current = null
      }
    }
  }, [playRequest, media, autoplayReady, requireUserEnable])

  useEffect(() => {
    if (!media) return
    if (!pendingRequest.current) return
    if (requireUserEnable && !autoplayReady && (media.type === "audio" || media.type === "video")) {
      return
    }
    runPlay(pendingRequest.current, media)
  }, [autoplayReady, requireUserEnable, media])

  useEffect(() => {
    const mediaEl =
      media?.type === "audio"
        ? audioRef.current
        : media?.type === "video"
          ? videoRef.current
          : null

    if (!mediaEl) return

    const handleReady = () => {
      if (!pendingRequest.current) return
      if (requireUserEnable && !autoplayReady && (media?.type === "audio" || media?.type === "video")) {
        return
      }
      if (!media) return
      runPlay(pendingRequest.current, media)
    }

    mediaEl.addEventListener("loadeddata", handleReady)
    mediaEl.addEventListener("canplay", handleReady)

    return () => {
      mediaEl.removeEventListener("loadeddata", handleReady)
      mediaEl.removeEventListener("canplay", handleReady)
    }
  }, [media, autoplayReady, requireUserEnable])

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
        <div className={clsx(containerClass, "relative px-4")}>
          {promptEnable && (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center rounded-md bg-black/60 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex max-w-lg flex-col items-center gap-3 text-center text-white">
                <p className="text-lg font-semibold">Enable synced playback</p>
                <p className="text-sm text-white/90">
                  Tap once so we can start audio when the host hits play.
                </p>
                <button
                  type="button"
                  className="rounded-full bg-primary px-4 py-2 font-semibold text-white shadow outline-none focus:ring-2 focus:ring-white pointer-events-auto"
                  tabIndex={0}
                  onClick={primeAutoplay}
                >
                  Allow audio
                </button>
              </div>
            </div>
          )}
          <audio
            ref={audioRef}
            controls
            crossOrigin="anonymous"
            src={media.url}
            className={clsx(
              "mt-4 w-full rounded-md bg-black/40 p-2 shadow-lg",
              promptEnable && "pointer-events-none opacity-50",
            )}
            preload="auto"
            onPlay={() => onPlayChange?.(true)}
            onPause={() => onPlayChange?.(false)}
            onEnded={() => onPlayChange?.(false)}
          />
        </div>
      )

    case "video":
      return (
        <div className={clsx(containerClass, "relative")}>
          {promptEnable && (
            <div
              className="absolute inset-0 z-50 flex items-center justify-center rounded-md bg-black/60 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex max-w-lg flex-col items-center gap-3 text-center text-white">
                <p className="text-lg font-semibold">Enable synced playback</p>
                <p className="text-sm text-white/90">
                  Tap once so we can start video when the host hits play.
                </p>
                <button
                  type="button"
                  className="rounded-full bg-primary px-4 py-2 font-semibold text-white shadow outline-none focus:ring-2 focus:ring-white pointer-events-auto"
                  tabIndex={0}
                  onClick={primeAutoplay}
                >
                  Allow video
                </button>
              </div>
            </div>
          )}
          <video
            ref={videoRef}
            controls
            crossOrigin="anonymous"
            playsInline
            src={media.url}
            className={clsx(
              "m-4 w-full max-w-5xl rounded-md shadow-lg",
              promptEnable && "pointer-events-none opacity-50",
            )}
            preload="auto"
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

export default QuestionMedia
