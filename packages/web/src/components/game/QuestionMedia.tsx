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
const isIOS = typeof navigator !== "undefined" && /iP(hone|ad|od)/.test(navigator.userAgent)

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
    const alreadyAllowed = stored === "true"
    if (alreadyAllowed && !isIOS) {
      setAutoplayReady(true)
      setPromptEnable(false)
    } else if (requireUserEnable) {
      // On iOS we still need a fresh gesture each load
      setPromptEnable(true)
      setAutoplayReady(false)
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
      const silent = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=")
      silent.muted = true
      await silent.play().catch(() => {})
      globalUnlocked = true
    } catch {
      // ignore
    }
  }

  const primeAutoplay = async () => {
    setPromptEnable(false)
    setAutoplayReady(true)
    try {
      await ensureUnlocked()
    } catch {
      // ignore
    }

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, "true")
      } catch {
        // ignore
      }
    }

    const el =
      media?.type === "audio"
        ? audioRef.current
          : media?.type === "video"
            ? videoRef.current
            : null

    if (el) {
      try {
        el.muted = true
        await el.play()
        el.pause()
        el.currentTime = 0
        setTimeout(() => {
          if (el) el.muted = false
        }, 150)
      } catch {
        if (el) el.muted = false
      }
    }

    if (pendingRequest.current && media) {
      const req = pendingRequest.current
      const bumped =
        req.startAt < Date.now() ? { ...req, startAt: Date.now() + 300 } : req
      runPlay(bumped, media)
    } else if (el && media && (media.type === "audio" || media.type === "video")) {
      el.currentTime = 0
      void el.play().catch(() => {})
    }
  }

  const runPlay = (request: { nonce: number; startAt: number }, currentMedia: QuestionMediaType) => {
    const { nonce, startAt } = request
    lastNonce.current = nonce

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
        if (isIOS) el.muted = true
        el.load?.()
        el.pause()
        el.currentTime = 0
        await el.play()
        lastNonce.current = nonce
        pendingRequest.current = null
      } catch {
        try {
          el.muted = true
          el.load?.()
          el.pause()
          el.currentTime = 0
          await el.play()
          setTimeout(() => {
            el.muted = false
          }, 150)
          lastNonce.current = nonce
          pendingRequest.current = null
        } catch {
          if (requireUserEnable && !autoplayReady) {
            setPromptEnable(true)
            pendingRequest.current = request
            lastNonce.current = 0
          }
        }
      }
    }

    pendingRequest.current = request
    // If the start time is already in the past, nudge forward a bit
    const delay = Math.max(0, startAt - Date.now() + 120)
    playTimer.current = setTimeout(() => {
      playTimer.current = null
      if (currentMedia.type === "audio") {
        tryPlay(audioRef.current)
      } else if (currentMedia.type === "video") {
        tryPlay(videoRef.current)
      }
    }, delay)

    // fallback: if still stalled shortly after start time, try another play without re-prompt
    fallbackTimer.current = setTimeout(() => {
      const el =
        currentMedia.type === "audio"
          ? audioRef.current
          : currentMedia.type === "video"
            ? videoRef.current
            : null
      if (!el) return
      if (el.paused || el.currentTime === 0) {
        tryPlay(el)
      }
    }, delay + 800)
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
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
              <div className="w-full max-w-md rounded-lg bg-white/10 p-5 text-center text-white shadow-2xl">
                <p className="mb-2 text-lg font-semibold">Enable synced playback</p>
                <p className="mb-4 text-sm text-white/90">
                  Tap once so we can start audio when the host hits play.
                </p>
                <button
                  type="button"
                  className="w-full rounded-full bg-primary px-4 py-3 text-lg font-semibold text-white shadow outline-none focus:ring-2 focus:ring-white"
                  onClick={() => primeAutoplay()}
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
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
              <div className="w-full max-w-md rounded-lg bg-white/10 p-5 text-center text-white shadow-2xl">
                <p className="mb-2 text-lg font-semibold">Enable synced playback</p>
                <p className="mb-4 text-sm text-white/90">
                  Tap once so we can start video when the host hits play.
                </p>
                <button
                  type="button"
                  className="w-full rounded-full bg-primary px-4 py-3 text-lg font-semibold text-white shadow outline-none focus:ring-2 focus:ring-white"
                  onClick={() => primeAutoplay()}
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
