"use client"

import { QuizzWithId } from "@rahoot/common/types/game"
import { STATUS } from "@rahoot/common/types/game/status"
import ManagerPassword from "@rahoot/web/components/game/create/ManagerPassword"
import QuizEditor from "@rahoot/web/components/game/create/QuizEditor"
import MediaLibrary from "@rahoot/web/components/game/create/MediaLibrary"
import ThemeEditor from "@rahoot/web/components/game/create/ThemeEditor"
import SelectQuizz from "@rahoot/web/components/game/create/SelectQuizz"
import Button from "@rahoot/web/components/Button"
import { useEvent, useSocket } from "@rahoot/web/contexts/socketProvider"
import { useManagerStore } from "@rahoot/web/stores/manager"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const Manager = () => {
  const { gameId, setGameId, setStatus } = useManagerStore()
  const router = useRouter()
  const { socket } = useSocket()

  const [isAuth, setIsAuth] = useState(false)
  const [quizzList, setQuizzList] = useState<QuizzWithId[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [showMedia, setShowMedia] = useState(false)
  const [showTheme, setShowTheme] = useState(false)
  const [resumeGameId, setResumeGameId] = useState<string | null>(null)

  useEvent("manager:quizzList", (quizzList) => {
    setIsAuth(true)
    setQuizzList(quizzList)
  })

  useEvent("manager:gameCreated", ({ gameId, inviteCode }) => {
    setGameId(gameId)
    setStatus(STATUS.SHOW_ROOM, { text: "Waiting for the players", inviteCode })
    setResumeGameId(gameId)
    router.push(`/game/manager/${gameId}`)
  })

  useEvent(
    "manager:successReconnect",
    ({ gameId, status, players, currentQuestion }) => {
      setGameId(gameId)
      setStatus(status.name, status.data)
      setResumeGameId(gameId)
      router.push(`/game/manager/${gameId}`)
    },
  )

  const handleAuth = (password: string) => {
    socket?.emit("manager:auth", password)
  }
  const handleCreate = (quizzId: string) => {
    socket?.emit("game:create", quizzId)
  }
  const handleBreakToggle = (active: boolean) => {
    if (!gameId) return
    socket?.emit("manager:setBreak", { gameId, active })
  }

  const handleResume = () => {
    if (!resumeGameId) return
    socket?.emit("manager:reconnect", { gameId: resumeGameId })
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem("last_manager_game_id")
      if (stored) {
        setResumeGameId(stored)
      }
    } catch {}
  }, [])

  if (!isAuth) {
    return <ManagerPassword onSubmit={handleAuth} />
  }

  if (showEditor) {
    return (
      <QuizEditor
        quizzList={quizzList}
        onBack={() => setShowEditor(false)}
        onListUpdate={setQuizzList}
        onBreakToggle={handleBreakToggle}
        gameId={gameId}
      />
    )
  }

  if (showMedia) {
    return (
      <div className="flex w-full max-w-6xl flex-col gap-4 rounded-md bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowMedia(false)} className="bg-gray-700">
            Back
          </Button>
          <div className="flex flex-col leading-tight">
            <h2 className="text-lg font-semibold text-gray-900">Media library</h2>
            <p className="text-xs text-gray-500">Upload, view, and delete unused media.</p>
          </div>
        </div>
        <MediaLibrary />
      </div>
    )
  }

  if (showTheme) {
    return <ThemeEditor onBack={() => setShowTheme(false)} />
  }

  return (
    <SelectQuizz
      quizzList={quizzList}
      onSelect={handleCreate}
      onManage={() => setShowEditor(true)}
      onMedia={() => setShowMedia(true)}
      onTheme={() => setShowTheme(true)}
      resumeGameId={resumeGameId}
      onResume={handleResume}
    />
  )
}

export default Manager
