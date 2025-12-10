"use client"

import { STATUS } from "@rahoot/common/types/game/status"
import GameWrapper from "@rahoot/web/components/game/GameWrapper"
import Answers from "@rahoot/web/components/game/states/Answers"
import Prepared from "@rahoot/web/components/game/states/Prepared"
import Question from "@rahoot/web/components/game/states/Question"
import Result from "@rahoot/web/components/game/states/Result"
import Start from "@rahoot/web/components/game/states/Start"
import Wait from "@rahoot/web/components/game/states/Wait"
import { useEvent, useSocket } from "@rahoot/web/contexts/socketProvider"
import { usePlayerStore } from "@rahoot/web/stores/player"
import { useQuestionStore } from "@rahoot/web/stores/question"
import { GAME_STATE_COMPONENTS } from "@rahoot/web/utils/constants"
import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import toast from "react-hot-toast"

const Game = () => {
  const router = useRouter()
  const { socket } = useSocket()
  const { gameId: gameIdParam }: { gameId?: string } = useParams()
  const { status, player, setPlayer, setGameId, setStatus, reset } =
    usePlayerStore()
  const { setQuestionStates } = useQuestionStore()
  const handleLeave = () => {
    reset()
    setQuestionStates(null)
    try {
      localStorage.removeItem("last_game_id")
      localStorage.removeItem("last_username")
      localStorage.removeItem("last_points")
    } catch {}
    router.replace("/")
  }

  useEvent("connect", () => {
    if (gameIdParam) {
      socket?.emit("player:reconnect", { gameId: gameIdParam })
    }
  })

  useEvent(
    "player:successReconnect",
    ({ gameId, status, player, currentQuestion }) => {
      setGameId(gameId)
      setStatus(status.name, status.data)
      setPlayer(player)
      setQuestionStates(currentQuestion)
      try {
        localStorage.setItem("last_game_id", gameId)
        if (player?.username) {
          localStorage.setItem("last_username", player.username)
        }
      } catch {}
    },
  )

  useEvent("game:status", ({ name, data }) => {
    if (name in GAME_STATE_COMPONENTS) {
      setStatus(name, data)
    }
  })

  useEvent("game:reset", (message) => {
    router.replace("/")
    reset()
    setQuestionStates(null)
    try {
      localStorage.removeItem("last_game_id")
      localStorage.removeItem("last_username")
      localStorage.removeItem("last_points")
    } catch {}
    toast.error(message)
  })

  // Hydrate username/points for footer immediately after refresh
  useEffect(() => {
    if (player?.username) return
    try {
      const name = localStorage.getItem("last_username")
      const ptsRaw = localStorage.getItem("last_points")
      const pts = ptsRaw ? Number(ptsRaw) : undefined
      if (name || typeof pts === "number") {
        setPlayer({
          username: name || undefined,
          points: pts,
        })
      }
    } catch {
      // ignore
    }
  }, [player?.username, setPlayer])

  if (!gameIdParam) {
    return null
  }

  let component = null

  switch (status?.name) {
    case STATUS.WAIT:
      component = <Wait data={status.data} />

      break

    case STATUS.SHOW_START:
      component = <Start data={status.data} />

      break

    case STATUS.SHOW_PREPARED:
      component = <Prepared data={status.data} />

      break

    case STATUS.SHOW_QUESTION:
      component = <Question data={status.data} />

      break

    case STATUS.SHOW_RESULT:
      component = <Result data={status.data} />

      break

    case STATUS.SELECT_ANSWER:
      component = <Answers data={status.data} />

      break
  }

  return (
    <GameWrapper statusName={status?.name} onLeave={handleLeave}>
      {component}
    </GameWrapper>
  )
}

export default Game
