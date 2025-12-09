"use client"

import { Status } from "@rahoot/common/types/game/status"
import background from "@rahoot/web/assets/background.webp"
import Button from "@rahoot/web/components/Button"
import Loader from "@rahoot/web/components/Loader"
import { useEvent, useSocket } from "@rahoot/web/contexts/socketProvider"
import { usePlayerStore } from "@rahoot/web/stores/player"
import { useQuestionStore } from "@rahoot/web/stores/question"
import { useThemeStore } from "@rahoot/web/stores/theme"
import { MANAGER_SKIP_BTN } from "@rahoot/web/utils/constants"
import clsx from "clsx"
import { PropsWithChildren, useEffect, useState } from "react"

type Props = PropsWithChildren & {
  statusName: Status | undefined
  onNext?: () => void
  onPause?: () => void
  paused?: boolean
  showPause?: boolean
  onEnd?: () => void
  players?: { id: string; username: string; connected: boolean }[]
  manager?: boolean
}

const GameWrapper = ({
  children,
  statusName,
  onNext,
  onPause,
  paused,
  showPause,
  onEnd,
  players,
  manager,
}: Props) => {
  const { isConnected } = useSocket()
  const { player } = usePlayerStore()
  const { questionStates, setQuestionStates } = useQuestionStore()
  const { backgroundUrl, setBackground, setBrandName } = useThemeStore()
  const [isDisabled, setIsDisabled] = useState(false)
  const [onBreak, setOnBreak] = useState(false)
  const next = statusName ? MANAGER_SKIP_BTN[statusName] : null

  useEvent("game:updateQuestion", ({ current, total }) => {
    setQuestionStates({
      current,
      total,
    })
  })

  useEffect(() => {
    setIsDisabled(false)
  }, [statusName])

  useEvent("game:break", (active) => setOnBreak(active))
  useEvent("manager:break", (active) => setOnBreak(active))

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const res = await fetch("/api/theme", { cache: "no-store" })
        const data = await res.json()
        if (res.ok && data.theme) {
          if (typeof data.theme.backgroundUrl === "string") {
            setBackground(data.theme.backgroundUrl || null)
          }
          if (typeof data.theme.brandName === "string") {
            setBrandName(data.theme.brandName)
          }
        }
      } catch (error) {
        console.error("Failed to load theme", error)
      }
    }

    loadTheme()
  }, [setBackground, setBrandName])

  const handleNext = () => {
    setIsDisabled(true)
    onNext?.()
  }

  const resolvedBackground = backgroundUrl || background.src

  return (
    <section className="relative flex min-h-screen w-full flex-col justify-between">
      <div
        className="fixed top-0 left-0 -z-10 h-full w-full bg-orange-600 opacity-70"
        style={{
          backgroundImage: `url(${resolvedBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.7,
        }}
      >
        <div className="h-full w-full bg-black/10" />
      </div>

      {!isConnected && !statusName ? (
        <div className="flex h-full w-full flex-1 flex-col items-center justify-center">
          <Loader />
          <h1 className="text-4xl font-bold text-white">Connecting...</h1>
        </div>
      ) : (
        <>
          <div className="flex w-full justify-between p-4">
            {questionStates && (
              <div className="shadow-inset flex items-center rounded-md bg-white p-2 px-4 text-lg font-bold text-black">
                {`${questionStates.current} / ${questionStates.total}`}
              </div>
            )}

            {manager && next && (
              <Button
                className={clsx("self-end bg-white px-4 text-black!", {
                  "pointer-events-none": isDisabled,
                })}
                onClick={handleNext}
              >
                {next}
              </Button>
            )}

            {manager && showPause && (
              <Button
                className={clsx("self-end bg-white px-4 text-black!", {
                  "pointer-events-none": isDisabled,
                })}
                onClick={onPause}
              >
                {paused ? "Resume" : "Pause"}
              </Button>
            )}

            {manager && onEnd && (
              <Button className="self-end bg-red-600 px-4" onClick={onEnd}>
                End game
              </Button>
            )}
          </div>

          {manager && players && players.length > 0 && (
            <div className="mx-4 mb-2 rounded-md bg-white/90 p-3 text-sm shadow">
              <div className="mb-1 text-xs font-semibold uppercase text-gray-600">
                Players ({players.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {players.map((p) => (
                  <span
                    key={p.id}
                    className={clsx(
                      "rounded border px-2 py-1 font-semibold",
                      p.connected
                        ? "border-green-500 text-green-700"
                        : "border-gray-300 text-gray-500",
                    )}
                  >
                    {p.username || p.id} {p.connected ? "" : "(disc.)"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {children}

          {!manager && (
            <div className="z-50 flex items-center justify-between bg-white px-4 py-2 text-lg font-bold text-white">
              <p className="text-gray-800">{player?.username}</p>
              <div className="rounded-sm bg-gray-800 px-3 py-1 text-lg">
                {player?.points}
              </div>
            </div>
          )}

          {onBreak && (
            <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/60">
              <div className="rounded-md bg-white/90 px-6 py-4 text-center shadow-lg">
                <p className="text-lg font-semibold text-gray-800">Game paused for a break</p>
                <p className="text-sm text-gray-600">We&apos;ll resume from the same spot.</p>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default GameWrapper
