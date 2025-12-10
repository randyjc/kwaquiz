import { Server as ServerIO, Socket as SocketIO } from "socket.io"
import { GameUpdateQuestion, Player, Quizz, QuizzWithId } from "."
import { Status, StatusDataMap } from "./status"

export type Server = ServerIO<ClientToServerEvents, ServerToClientEvents>
export type Socket = SocketIO<ClientToServerEvents, ServerToClientEvents>

export type Message<K extends keyof StatusDataMap = keyof StatusDataMap> = {
  gameId?: string
  status: K
  data: StatusDataMap[K]
}

export type MessageWithoutStatus<T = any> = {
  gameId?: string
  data: T
}

export type MessageGameId = {
  gameId?: string
}

export interface ServerToClientEvents {
  connect: () => void

  // Game events
  "game:status": (_data: { name: Status; data: StatusDataMap[Status] }) => void
  "game:successRoom": (_data: string) => void
  "game:successJoin": (_gameId: string) => void
  "game:totalPlayers": (_count: number) => void
  "game:errorMessage": (_message: string) => void
  "game:startCooldown": () => void
  "game:cooldown": (_count: number) => void
  "game:cooldownPause": (_paused: boolean) => void
  "game:reset": (_message: string) => void
  "game:mediaPlay": (_data: { startAt: number; nonce: number }) => void
  "game:updateQuestion": (_data: { current: number; total: number }) => void
  "game:playerAnswer": (_count: number) => void
  "game:break": (_active: boolean) => void

  // Player events
  "player:successReconnect": (_data: {
    gameId: string
    status: { name: Status; data: StatusDataMap[Status] }
    player: { username: string; points: number }
    currentQuestion: GameUpdateQuestion
  }) => void
  "player:updateLeaderboard": (_data: { leaderboard: Player[] }) => void

  // Manager events
  "manager:successReconnect": (_data: {
    gameId: string
    status: { name: Status; data: StatusDataMap[Status] }
    players: Player[]
    currentQuestion: GameUpdateQuestion
  }) => void
  "manager:quizzList": (_quizzList: QuizzWithId[]) => void
  "manager:gameCreated": (_data: { gameId: string; inviteCode: string }) => void
  "manager:statusUpdate": (_data: {
    status: Status
    data: StatusDataMap[Status]
  }) => void
  "manager:newPlayer": (_player: Player) => void
  "manager:removePlayer": (_playerId: string) => void
  "manager:players": (_players: Player[]) => void
  "manager:errorMessage": (_message: string) => void
  "manager:playerKicked": (_playerId: string) => void
  "manager:quizzLoaded": (_quizz: QuizzWithId) => void
  "manager:quizzSaved": (_quizz: QuizzWithId) => void
  "manager:quizzDeleted": (_id: string) => void
  "manager:break": (_active: boolean) => void
  "viewer:joined": (_data: { gameId: string; status?: { name: Status; data: StatusDataMap[Status] } }) => void
}

export interface ClientToServerEvents {
  // Manager actions
  "game:create": (_quizzId: string) => void
  "manager:auth": (_password: string) => void
  "manager:reconnect": (_message: { gameId: string }) => void
  "manager:kickPlayer": (_message: { gameId: string; playerId: string }) => void
  "manager:startGame": (_message: MessageGameId) => void
  "manager:abortQuiz": (_message: MessageGameId) => void
  "manager:pauseCooldown": (_message: MessageGameId) => void
  "manager:resumeCooldown": (_message: MessageGameId) => void
  "manager:setBreak": (_message: { gameId?: string; active: boolean }) => void
  "manager:setQuestionPreview": (_message: { gameId?: string; show: boolean }) => void
  "manager:setViewerMode": (_message: { gameId?: string; enabled: boolean }) => void
  "manager:playMedia": (_message: MessageGameId) => void
  "manager:endGame": (_message: MessageGameId) => void
  "manager:skipQuestionIntro": (_message: MessageGameId) => void
  "manager:nextQuestion": (_message: MessageGameId) => void
  "manager:deleteQuizz": (_message: { id: string }) => void
  "manager:showLeaderboard": (_message: MessageGameId) => void
  "manager:getQuizz": (_quizzId: string) => void
  "manager:saveQuizz": (_payload: { id: string | null; quizz: Quizz }) => void

  // Player actions
  "player:join": (_inviteCode: string) => void
  "player:login": (_message: MessageWithoutStatus<{ username: string }>) => void
  "player:reconnect": (_message: { gameId: string }) => void
  "player:selectedAnswer": (
    _message: MessageWithoutStatus<{ answerKey: number }>
  ) => void

  // Viewer
  "viewer:join": (_message: { inviteCode: string; password: string }) => void

  // Common
  disconnect: () => void
}
