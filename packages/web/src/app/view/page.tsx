"use client"

import { STATUS, Status } from "@rahoot/common/types/game/status"
import QuestionMedia from "@rahoot/web/components/game/QuestionMedia"
import { useEvent, useSocket } from "@rahoot/web/contexts/socketProvider"
import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"

type StatusPayload = { name: Status; data: any } | null

const ViewerPage = () => {
  const { socket, isConnected } = useSocket()
  const [password, setPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [status, setStatus] = useState<StatusPayload>(null)
  const [joinedGame, setJoinedGame] = useState<string | null>(null)

  useEvent("game:status", (incoming) => {
    setStatus(incoming)
  })

  useEvent("viewer:joined", ({ gameId, status }) => {
    setJoinedGame(gameId)
    if (status) setStatus(status)
    toast.success("Viewer connected")
  })

  useEvent("game:errorMessage", (msg) => toast.error(msg))
  useEvent("manager:errorMessage", (msg) => toast.error(msg))
  useEvent("game:reset", (msg) => {
    toast.error(msg)
    setJoinedGame(null)
    setStatus(null)
  })

  useEffect(() => {
    if (socket && !socket.connected) {
      socket.connect()
    }
  }, [socket])

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

  const content = useMemo(() => {
    if (!status) {
      return (
        <div className="rounded-md bg-white/90 p-6 text-center shadow">
          <p className="text-lg font-semibold text-gray-800">
            Enter PIN and manager password to start viewing.
          </p>
        </div>
      )
    }

    switch (status.name) {
      case STATUS.SHOW_QUESTION: {
        const data: any = status.data
        const media =
          data.media || (data.image ? { type: "image", url: data.image } : undefined)
        return (
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-center text-4xl font-bold text-white drop-shadow">
              {data.question}
            </h2>
            <QuestionMedia media={media} alt={data.question} />
          </div>
        )
      }
      case STATUS.SELECT_ANSWER: {
        const data: any = status.data
        const media =
          data.media || (data.image ? { type: "image", url: data.image } : undefined)
        return (
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-center text-4xl font-bold text-white drop-shadow">
              {data.question}
            </h2>
            <QuestionMedia media={media} alt={data.question} />
            <div className="w-full max-w-4xl rounded-md bg-white/90 p-4 shadow">
              <h3 className="mb-3 text-lg font-semibold text-gray-800">Answers</h3>
              <ul className="space-y-2 text-gray-900">
                {data.answers?.map((ans: string, idx: number) => (
                  <li
                    key={idx}
                    className="rounded-md bg-gray-100 px-3 py-2 text-base font-semibold"
                  >
                    {ans}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )
      }
      case STATUS.SHOW_PREPARED: {
        const data: any = status.data
        return (
          <div className="rounded-md bg-white/90 p-6 text-center shadow">
            <p className="text-lg font-semibold text-gray-800">
              Question {data.questionNumber} is coming up…
            </p>
          </div>
        )
      }
      case STATUS.SHOW_START: {
        const data: any = status.data
        return (
          <div className="rounded-md bg-white/90 p-6 text-center shadow">
            <p className="text-lg font-semibold text-gray-800">
              Starting {data.subject} in {data.time}s
            </p>
          </div>
        )
      }
      case STATUS.WAIT: {
        const data: any = status.data
        return (
          <div className="rounded-md bg-white/90 p-6 text-center shadow">
            <p className="text-lg font-semibold text-gray-800">{data.text}</p>
          </div>
        )
      }
      default:
        return (
          <div className="rounded-md bg-white/90 p-6 text-center shadow">
            <p className="text-lg font-semibold text-gray-800">Waiting for updates…</p>
          </div>
        )
    }
  }, [status])

  return (
    <div className="min-h-screen bg-black/80 bg-[radial-gradient(circle_at_top_left,_rgba(255,165,0,0.15),_transparent_50%),_radial-gradient(circle_at_bottom_right,_rgba(255,165,0,0.2),_transparent_45%)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
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
            Use the manager password to authorize the big-screen viewer. Media will appear here when the
            manager enables viewer mode.
          </p>
        </div>

        <div className="flex w-full justify-center">{content}</div>
      </div>
    </div>
  )
}

export default ViewerPage
