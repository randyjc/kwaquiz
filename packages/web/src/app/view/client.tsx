"use client"

import { STATUS, Status } from "@rahoot/common/types/game/status"
import QuestionMedia from "@rahoot/web/components/game/QuestionMedia"
import { useEvent, useSocket } from "@rahoot/web/contexts/socketProvider"
import { useThemeStore } from "@rahoot/web/stores/theme"
import background from "@rahoot/web/assets/background.webp"
import clsx from "clsx"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

type StatusPayload = { name: Status; data: any } | null

const ViewerClient = () => {
  const { socket, isConnected } = useSocket()
  const { backgroundUrl, setBackground, setBrandName } = useThemeStore()
  const [password, setPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [status, setStatus] = useState<StatusPayload>(null)
  const [joinedGame, setJoinedGame] = useState<string | null>(null)
  const [lastResponses, setLastResponses] = useState<any | null>(null)

  useEvent("game:status", (incoming) => {
    setStatus(incoming)
    if (incoming?.name === STATUS.SHOW_RESPONSES) {
      setLastResponses(incoming.data)
    }
  })

  useEvent("viewer:joined", ({ gameId, status }) => {
    setJoinedGame(gameId)
    if (status) {
      setStatus(status)
      if (status.name === STATUS.SHOW_RESPONSES) {
        setLastResponses(status.data)
      }
    }
    toast.success("Viewer connected")
  })

  useEvent("game:errorMessage", (msg) => toast.error(msg))
  useEvent("manager:errorMessage", (msg) => toast.error(msg))
  useEvent("game:reset", (msg) => {
    toast.error(msg)
    setJoinedGame(null)
    setStatus(null)
    setLastResponses(null)
  })

  useEffect(() => {
    if (socket && !socket.connected) {
      socket.connect()
    }
  }, [socket])

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

  const handleJoin = () => {
    if (!password || !inviteCode) {
      toast.error("Enter password and PIN")
      return
    }
    socket?.emit("viewer:join", {
      inviteCode: inviteCode.trim(),
      password: password.trim(),
    })
  }

  const resolvedBackground = backgroundUrl || background.src

  // Prefer live status; if we drop back to WAIT after responses, keep showing the last results
  let viewStatus: StatusPayload = status
  if (!viewStatus && lastResponses) {
    viewStatus = { name: STATUS.SHOW_RESPONSES, data: lastResponses }
  } else if (
    viewStatus?.name === STATUS.WAIT &&
    lastResponses &&
    viewStatus.data?.text
  ) {
    viewStatus = { name: STATUS.SHOW_RESPONSES, data: lastResponses }
  }

  return (
    <div
      className="min-h-screen w-full bg-black/70"
      style={{
        backgroundImage: `url(${resolvedBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="rounded-md bg-white/90 p-4 shadow">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Game PIN"
              className="w-full max-w-xs rounded border px-3 py-2"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Manager password"
              className="w-full max-w-xs rounded border px-3 py-2"
            />
            <button
              onClick={handleJoin}
              className="rounded bg-primary px-4 py-2 font-semibold text-white shadow"
              disabled={!isConnected}
            >
              View
            </button>
            {joinedGame && (
              <span className="text-sm font-semibold text-gray-700">
                Viewing game {joinedGame}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600">
            Use the manager password to authorize the big-screen viewer. Media appears here in viewer mode.
          </p>
        </div>

        <div className="flex w-full justify-center">
          {!viewStatus ? (
            <div className="rounded-md bg-white/90 p-6 text-center shadow">
              <p className="text-lg font-semibold text-gray-800">
                Enter PIN and manager password to start viewing.
              </p>
            </div>
          ) : viewStatus.name === STATUS.SHOW_QUESTION ? (
            <div className="flex w-full max-w-6xl flex-col items-center gap-6 rounded-lg bg-white/90 p-6 shadow">
              <h2 className="text-center text-3xl font-bold text-gray-900">
                {viewStatus.data.question}
              </h2>
              <QuestionMedia
                media={
                  viewStatus.data.media ||
                  (viewStatus.data.image
                    ? { type: "image", url: viewStatus.data.image }
                    : undefined)
                }
                alt={viewStatus.data.question}
              />
            </div>
          ) : viewStatus.name === STATUS.SELECT_ANSWER ? (
            <div className="flex w-full max-w-6xl flex-col items-center gap-4 rounded-lg bg-white/90 p-6 shadow">
              <h2 className="text-center text-3xl font-bold text-gray-900">
                {viewStatus.data.question}
              </h2>
              {(viewStatus.data.media || viewStatus.data.image) && (
                <QuestionMedia
                  media={
                    viewStatus.data.media ||
                    (viewStatus.data.image
                      ? { type: "image", url: viewStatus.data.image }
                      : undefined)
                  }
                  alt={viewStatus.data.question}
                />
              )}
              <div className="grid w-full max-w-4xl grid-cols-2 gap-3">
                {viewStatus.data.answers?.map((ans: string, idx: number) => {
                  const isCorrect =
                    typeof viewStatus.data.solution === "number" &&
                    viewStatus.data.solution === idx
                  return (
                    <div
                      key={idx}
                      className={clsx(
                        "rounded-lg px-4 py-3 text-lg font-semibold shadow-inner",
                        isCorrect
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-900",
                      )}
                    >
                      {ans}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : viewStatus.name === STATUS.SHOW_PREPARED ? (
            <div className="rounded-md bg-white/90 p-6 text-center shadow">
              <p className="text-lg font-semibold text-gray-800">
                Question {viewStatus.data.questionNumber} is coming up…
              </p>
            </div>
          ) : viewStatus.name === STATUS.SHOW_RESPONSES ? (
            <div className="flex w-full max-w-6xl flex-col items-center gap-4 rounded-lg bg-white/90 p-6 shadow">
              <h2 className="text-center text-3xl font-bold text-gray-900">
                {viewStatus.data.question}
              </h2>
              {(viewStatus.data.media || viewStatus.data.image) && (
                <QuestionMedia
                  media={
                    viewStatus.data.media ||
                    (viewStatus.data.image
                      ? { type: "image", url: viewStatus.data.image }
                      : undefined)
                  }
                  alt={viewStatus.data.question}
                />
              )}
              <div className="grid w-full max-w-4xl grid-cols-2 gap-3">
                {viewStatus.data.answers?.map((ans: string, idx: number) => {
                  const isCorrect =
                    typeof viewStatus.data.solution === "number" &&
                    viewStatus.data.solution === idx
                  return (
                    <div
                      key={idx}
                      className={clsx(
                        "rounded-lg px-4 py-3 text-lg font-semibold shadow-inner",
                        isCorrect
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-900",
                      )}
                    >
                      {ans}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : viewStatus.name === STATUS.SHOW_START ? (
            <div className="rounded-md bg-white/90 p-6 text-center shadow">
              <p className="text-lg font-semibold text-gray-800">
                Starting {viewStatus.data.subject} in {viewStatus.data.time}s
              </p>
            </div>
          ) : viewStatus.name === STATUS.WAIT ? (
            <div className="rounded-md bg-white/90 p-6 text-center shadow">
              <p className="text-lg font-semibold text-gray-800">
                {viewStatus.data.text}
              </p>
            </div>
          ) : (
            <div className="rounded-md bg-white/90 p-6 text-center shadow">
              <p className="text-lg font-semibold text-gray-800">
                Waiting for updates…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ViewerClient
