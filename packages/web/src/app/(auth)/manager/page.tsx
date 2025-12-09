"use client"

import { QuizzWithId } from "@rahoot/common/types/game"
import { STATUS } from "@rahoot/common/types/game/status"
import ManagerPassword from "@rahoot/web/components/game/create/ManagerPassword"
import QuizEditor from "@rahoot/web/components/game/create/QuizEditor"
import MediaLibrary from "@rahoot/web/components/game/create/MediaLibrary"
import ThemeEditor from "@rahoot/web/components/game/create/ThemeEditor"
import SelectQuizz from "@rahoot/web/components/game/create/SelectQuizz"
import { useEvent, useSocket } from "@rahoot/web/contexts/socketProvider"
import { useManagerStore } from "@rahoot/web/stores/manager"
import { useRouter } from "next/navigation"
import { useState } from "react"

const Manager = () => {
  const { setGameId, setStatus } = useManagerStore()
  const router = useRouter()
  const { socket } = useSocket()

  const [isAuth, setIsAuth] = useState(false)
  const [quizzList, setQuizzList] = useState<QuizzWithId[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [showMedia, setShowMedia] = useState(false)
  const [showTheme, setShowTheme] = useState(false)

  useEvent("manager:quizzList", (quizzList) => {
    setIsAuth(true)
    setQuizzList(quizzList)
  })

  useEvent("manager:gameCreated", ({ gameId, inviteCode }) => {
    setGameId(gameId)
    setStatus(STATUS.SHOW_ROOM, { text: "Waiting for the players", inviteCode })
    router.push(`/game/manager/${gameId}`)
  })

  const handleAuth = (password: string) => {
    socket?.emit("manager:auth", password)
  }
  const handleCreate = (quizzId: string) => {
    socket?.emit("game:create", quizzId)
  }

  if (!isAuth) {
    return <ManagerPassword onSubmit={handleAuth} />
  }

  if (showEditor) {
    return (
      <QuizEditor
        quizzList={quizzList}
        onBack={() => setShowEditor(false)}
        onListUpdate={setQuizzList}
      />
    )
  }

  if (showMedia) {
    return (
      <div className="flex w-full flex-col gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setShowMedia(false)}
            className="rounded-md bg-gray-700 px-3 py-2 text-white"
          >
            Back
          </button>
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
    />
  )
}

export default Manager
