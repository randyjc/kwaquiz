import { Answer, Player, Quizz } from "@rahoot/common/types/game"
import { Server, Socket } from "@rahoot/common/types/game/socket"
import { Status, STATUS, StatusDataMap } from "@rahoot/common/types/game/status"
import Registry from "@rahoot/socket/services/registry"
import { saveSnapshot, loadSnapshot, deleteSnapshot, GameSnapshot } from "@rahoot/socket/services/persistence"
import { createInviteCode, timeToPoint } from "@rahoot/socket/utils/game"
import sleep from "@rahoot/socket/utils/sleep"
import { v4 as uuid } from "uuid"

const registry = Registry.getInstance()

class Game {
  io: Server

  gameId: string
  manager: {
    id: string
    clientId: string
    connected: boolean
  }
  inviteCode: string
  started: boolean

  lastBroadcastStatus: { name: Status; data: StatusDataMap[Status] } | null =
    null
  managerStatus: { name: Status; data: StatusDataMap[Status] } | null = null
  playerStatus: Map<string, { name: Status; data: StatusDataMap[Status] }> =
    new Map()

  leaderboard: Player[]
  tempOldLeaderboard: Player[] | null

  quizz: Quizz
  players: Player[]

  round: {
    currentQuestion: number
    playersAnswers: Answer[]
    startTime: number
  }

  cooldown: {
    active: boolean
    paused: boolean
    remaining: number
    timer: NodeJS.Timeout | null
    resolve: (() => void) | null
  }
  breakActive: boolean
  showQuestionPreview: boolean
  manualStartPending: boolean
  mediaPlayNonce: number

  constructor(io: Server, socket: Socket, quizz: Quizz) {
    if (!io) {
      throw new Error("Socket server not initialized")
    }

    this.io = io
    this.gameId = uuid()
    this.manager = {
      id: "",
      clientId: socket.handshake.auth.clientId,
      connected: true,
    }
    this.inviteCode = ""
    this.started = false

    this.lastBroadcastStatus = null
    this.managerStatus = null
    this.playerStatus = new Map()

    this.leaderboard = []
    this.tempOldLeaderboard = null

    this.players = []

    this.round = {
      playersAnswers: [],
      currentQuestion: 0,
      startTime: 0,
    }

    this.cooldown = {
      active: false,
      paused: false,
      remaining: 0,
      timer: null,
      resolve: null,
    }
    this.breakActive = false
    this.showQuestionPreview = true
    this.manualStartPending = false
    this.mediaPlayNonce = 0

    const roomInvite = createInviteCode()
    this.inviteCode = roomInvite
    this.manager.id = socket.id

    this.quizz = quizz

    socket.join(this.gameId)
    socket.emit("manager:gameCreated", {
      gameId: this.gameId,
      inviteCode: roomInvite,
    })

    console.log(
      `New game created: ${roomInvite} subject: ${this.quizz.subject}`
    )
    this.persist()
  }

  static async fromSnapshot(io: Server, snapshot: GameSnapshot) {
    const game = Object.create(Game.prototype) as Game
    game.io = io
    game.gameId = snapshot.gameId
    game.manager = {
      id: "",
      clientId: snapshot.manager?.clientId || "",
      connected: false,
    }
    game.inviteCode = snapshot.inviteCode
    game.started = snapshot.started
    game.lastBroadcastStatus = snapshot.lastBroadcastStatus || null
    game.managerStatus = snapshot.managerStatus || null
    game.playerStatus = new Map()
    game.leaderboard = snapshot.leaderboard || []
    game.tempOldLeaderboard = snapshot.tempOldLeaderboard || null
    game.quizz = snapshot.quizz
    game.players = (snapshot.players || []).map((p: Player) => ({
      ...p,
      id: "",
      connected: false,
    }))
    game.round = snapshot.round || {
      playersAnswers: [],
      currentQuestion: 0,
      startTime: 0,
    }
    game.cooldown = {
      active: snapshot.cooldown?.active || false,
      paused: snapshot.cooldown?.paused || false,
      remaining: snapshot.cooldown?.remaining || 0,
      timer: null,
      resolve: null,
    }
    game.breakActive = snapshot.breakActive || false
    game.showQuestionPreview =
      typeof snapshot.showQuestionPreview === "boolean"
        ? snapshot.showQuestionPreview
        : true
    game.manualStartPending = snapshot.manualStartPending || false
    game.mediaPlayNonce = snapshot.mediaPlayNonce || 0

    if (game.cooldown.active && game.cooldown.remaining > 0 && !game.cooldown.paused) {
      game.startCooldown(game.cooldown.remaining)
    }

    return game
  }

  broadcastStatus<T extends Status>(status: T, data: StatusDataMap[T]) {
    const statusData = { name: status, data }
    this.lastBroadcastStatus = statusData
    this.io.to(this.gameId).emit("game:status", statusData)
    this.persist()
  }

  sendStatus<T extends Status>(
    target: string,
    status: T,
    data: StatusDataMap[T]
  ) {
    const statusData = { name: status, data }

    if (this.manager.id === target) {
      this.managerStatus = statusData
    } else {
      this.playerStatus.set(target, statusData)
    }

    this.io.to(target).emit("game:status", statusData)
    this.persist()
  }

  toSnapshot(): GameSnapshot {
    return {
      gameId: this.gameId,
      inviteCode: this.inviteCode,
      started: this.started,
      manager: {
        clientId: this.manager.clientId,
      },
      lastBroadcastStatus: this.lastBroadcastStatus,
      managerStatus: this.managerStatus,
      leaderboard: this.leaderboard,
      tempOldLeaderboard: this.tempOldLeaderboard,
      quizz: this.quizz,
      players: this.players.map((p) => ({
        ...p,
        id: undefined,
        connected: false,
      })),
      round: this.round,
      cooldown: {
        active: this.cooldown.active,
        paused: this.cooldown.paused,
        remaining: this.cooldown.remaining,
      },
      breakActive: this.breakActive,
      showQuestionPreview: this.showQuestionPreview,
      manualStartPending: this.manualStartPending,
      mediaPlayNonce: this.mediaPlayNonce,
    }
  }

  async persist() {
    try {
      await saveSnapshot(this.gameId, this.toSnapshot())
    } catch (error) {
      console.error("Failed to persist game snapshot", error)
    }
  }

  async clearPersisted() {
    try {
      await deleteSnapshot(this.gameId)
    } catch (error) {
      console.error("Failed to delete game snapshot", error)
    }
  }

  join(socket: Socket, username: string) {
    const existing = this.players.find(
      (p) => p.clientId === socket.handshake.auth.clientId
    )

    if (existing) {
      // Reconnect existing player (even before game start)
      existing.id = socket.id
      existing.connected = true
      if (username) existing.username = username
      socket.join(this.gameId)
      this.io.to(this.manager.id).emit("manager:players", this.players)
      socket.emit("game:successJoin", this.gameId)
      return
    }

    socket.join(this.gameId)

    const playerData = {
      id: socket.id,
      clientId: socket.handshake.auth.clientId,
      connected: true,
      username,
      points: 0,
    }

    this.players.push(playerData)

    this.io.to(this.manager.id).emit("manager:newPlayer", playerData)
    this.io.to(this.manager.id).emit("manager:players", this.players)
    this.io.to(this.gameId).emit("game:totalPlayers", this.players.length)

    socket.emit("game:successJoin", this.gameId)
  }

  kickPlayer(socket: Socket, playerId: string) {
    if (this.manager.id !== socket.id) {
      return
    }

    const player = this.players.find((p) => p.id === playerId)

    if (!player) {
      return
    }

    this.players = this.players.filter((p) => p.id !== playerId)
    this.playerStatus.delete(playerId)

    this.io.in(playerId).socketsLeave(this.gameId)
    this.io
      .to(player.id)
      .emit("game:reset", "You have been kicked by the manager")
    this.io.to(this.manager.id).emit("manager:playerKicked", player.id)
    this.io.to(this.manager.id).emit("manager:players", this.players)

    this.io.to(this.gameId).emit("game:totalPlayers", this.players.length)
  }

  reconnect(socket: Socket) {
    const { clientId } = socket.handshake.auth
    const isManager = this.manager.clientId === clientId

    if (isManager) {
      this.reconnectManager(socket)
    } else {
      this.reconnectPlayer(socket)
    }
    this.io.to(this.manager.id).emit("manager:players", this.players)
  }

  private reconnectManager(socket: Socket) {
    if (this.manager.connected) {
      socket.emit("game:reset", "Manager already connected")

      return
    }

    socket.join(this.gameId)
    this.manager.id = socket.id
    this.manager.connected = true

    const status = this.managerStatus ||
      this.lastBroadcastStatus || {
        name: STATUS.WAIT,
        data: { text: "Waiting for players" },
      }

    socket.emit("manager:successReconnect", {
      gameId: this.gameId,
      currentQuestion: {
        current: this.round.currentQuestion + 1,
        total: this.quizz.questions.length,
      },
      status,
      players: this.players,
    })
    socket.emit("game:totalPlayers", this.players.length)
    if (this.breakActive) {
      socket.emit("manager:break", true)
      socket.emit("game:break", true)
    }

    registry.reactivateGame(this.gameId)
    console.log(`Manager reconnected to game ${this.inviteCode}`)
  }

  private reconnectPlayer(socket: Socket) {
    const { clientId } = socket.handshake.auth
    const player = this.players.find((p) => p.clientId === clientId)

    if (!player) {
      return
    }

    if (player.connected) {
      socket.emit("game:reset", "Player already connected")

      return
    }

    socket.join(this.gameId)

    const oldSocketId = player.id
    player.id = socket.id
    player.connected = true

    const status = this.playerStatus.get(oldSocketId) ||
      this.lastBroadcastStatus || {
        name: STATUS.WAIT,
        data: { text: "Waiting for players" },
      }

    if (this.playerStatus.has(oldSocketId)) {
      const oldStatus = this.playerStatus.get(oldSocketId)!
      this.playerStatus.delete(oldSocketId)
      this.playerStatus.set(socket.id, oldStatus)
    }
    this.io.to(this.manager.id).emit("manager:players", this.players)

    socket.emit("player:successReconnect", {
      gameId: this.gameId,
      currentQuestion: {
        current: this.round.currentQuestion + 1,
        total: this.quizz.questions.length,
      },
      status,
      player: {
        username: player.username,
        points: player.points,
      },
    })
    socket.emit("game:totalPlayers", this.players.length)
    if (this.breakActive) {
      socket.emit("game:break", true)
    }
    console.log(
      `Player ${player.username} reconnected to game ${this.inviteCode}`
    )
  }

  startCooldown(seconds: number): Promise<void> {
    if (this.cooldown.active) {
      return Promise.resolve()
    }

    this.cooldown.active = true
    this.cooldown.paused = false
    this.cooldown.remaining = seconds

    return new Promise<void>((resolve) => {
      this.cooldown.resolve = resolve

      const tick = () => {
        if (!this.cooldown.active) {
          this.finishCooldown()
          return
        }

        if (this.cooldown.paused) {
          return
        }

        this.cooldown.remaining -= 1

        if (this.cooldown.remaining <= 0) {
          this.finishCooldown()
          return
        }

        this.io.to(this.gameId).emit("game:cooldown", this.cooldown.remaining)
        this.persist()
      }

      // initial emit
      this.io.to(this.gameId).emit("game:cooldown", this.cooldown.remaining)
      this.persist()

      this.cooldown.timer = setInterval(tick, 1000)
    })
  }

  abortCooldown() {
    if (!this.cooldown.active) {
      return
    }

    this.cooldown.active = false
    this.cooldown.paused = false
    this.io.to(this.gameId).emit("game:cooldownPause", false)
    this.persist()
    this.finishCooldown()
  }

  finishCooldown() {
    if (this.cooldown.timer) {
      clearInterval(this.cooldown.timer)
    }
    this.cooldown.timer = null
    this.cooldown.active = false
    this.cooldown.paused = false
    this.cooldown.remaining = 0
    if (this.cooldown.resolve) {
      this.cooldown.resolve()
    }
    this.cooldown.resolve = null
  }

  pauseCooldown(socket: Socket) {
    if (this.manager.id !== socket.id || !this.cooldown.active || this.cooldown.paused) {
      return
    }

    this.cooldown.paused = true
    this.io.to(this.gameId).emit("game:cooldownPause", true)
    this.persist()
  }

  resumeCooldown(socket: Socket) {
    if (this.manager.id !== socket.id || !this.cooldown.active || !this.cooldown.paused) {
      return
    }

    this.cooldown.paused = false
    this.io.to(this.gameId).emit("game:cooldownPause", false)
    this.persist()
  }

  setBreak(socket: Socket, active: boolean) {
    if (this.manager.id !== socket.id) {
      return
    }

    this.breakActive = active

    if (this.cooldown.active) {
      if (active) {
        this.cooldown.paused = true
      } else {
        this.cooldown.paused = false
      }
      this.io.to(this.gameId).emit("game:cooldownPause", this.cooldown.paused)
    }

    this.io.to(this.gameId).emit("game:break", active)
    this.io.to(this.manager.id).emit("manager:break", active)
    this.persist()
  }

  setQuestionPreview(socket: Socket, show: boolean) {
    if (this.manager.id !== socket.id) {
      return
    }
    this.showQuestionPreview = show
    this.persist()
  }

  skipQuestionIntro(socket: Socket) {
    if (this.manager.id !== socket.id) {
      return
    }

    if (!this.started) {
      return
    }

    if (this.manualStartPending) {
      this.manualStartPending = false
      const question = this.quizz.questions[this.round.currentQuestion]
      this.startAnswerPhase(question)
      return
    }

    this.abortCooldown()
  }

  async start(socket: Socket) {
    if (this.manager.id !== socket.id) {
      return
    }

    if (this.started) {
      return
    }

    this.started = true

    this.broadcastStatus(STATUS.SHOW_START, {
      time: 3,
      subject: this.quizz.subject,
    })

    await sleep(3)

    this.io.to(this.gameId).emit("game:startCooldown")
    await this.startCooldown(3)

    this.newRound()
    this.persist()
  }

  async newRound() {
    const question = this.quizz.questions[this.round.currentQuestion]

    if (!this.started) {
      return
    }

    this.playerStatus.clear()

    this.io.to(this.gameId).emit("game:updateQuestion", {
      current: this.round.currentQuestion + 1,
      total: this.quizz.questions.length,
    })

    this.managerStatus = null
    this.broadcastStatus(STATUS.SHOW_PREPARED, {
      totalAnswers: question.answers.length,
      questionNumber: this.round.currentQuestion + 1,
    })

    await sleep(2)

    if (!this.started) {
      return
    }

    this.broadcastStatus(STATUS.SHOW_QUESTION, {
      question: question.question,
      image: question.image,
      media: question.media,
      cooldown: question.cooldown,
      showQuestion: this.showQuestionPreview,
    })

    if (question.cooldown > 0) {
      await this.startCooldown(question.cooldown)
    }

    if (!this.started) {
      return
    }

    await this.startAnswerPhase(question)
  }

  showResults(question: any) {
    const oldLeaderboard =
      this.leaderboard.length === 0
        ? this.players.map((p) => ({ ...p }))
        : this.leaderboard.map((p) => ({ ...p }))

    const totalType = this.round.playersAnswers.reduce(
      (acc: Record<number, number>, { answerId }) => {
        acc[answerId] = (acc[answerId] || 0) + 1

        return acc
      },
      {}
    )

    const sortedPlayers = this.players
      .map((player) => {
        const playerAnswer = this.round.playersAnswers.find(
          (a) => a.playerId === player.id
        )

        const isCorrect = playerAnswer
          ? playerAnswer.answerId === question.solution
          : false

        const points =
          playerAnswer && isCorrect ? Math.round(playerAnswer.points) : 0

        player.points += points

        return { ...player, lastCorrect: isCorrect, lastPoints: points }
      })
      .sort((a, b) => b.points - a.points)

    this.players = sortedPlayers

    sortedPlayers.forEach((player, index) => {
      const rank = index + 1
      const aheadPlayer = sortedPlayers[index - 1]

      this.sendStatus(player.id, STATUS.SHOW_RESULT, {
        correct: player.lastCorrect,
        message: player.lastCorrect ? "Nice!" : "Too bad",
        points: player.lastPoints,
        myPoints: player.points,
        rank,
        aheadOfMe: aheadPlayer ? aheadPlayer.username : null,
      })
    })

    this.sendStatus(this.manager.id, STATUS.SHOW_RESPONSES, {
      question: question.question,
      responses: totalType,
      correct: question.solution,
      answers: question.answers,
      image: question.image,
   media: question.media,
    })

    this.leaderboard = sortedPlayers
    this.tempOldLeaderboard = oldLeaderboard

    this.round.playersAnswers = []
    this.persist()
  }
  selectAnswer(socket: Socket, answerId: number) {
    const player = this.players.find((player) => player.id === socket.id)
    const question = this.quizz.questions[this.round.currentQuestion]

    if (!player) {
      return
    }

    if (this.round.playersAnswers.find((p) => p.playerId === socket.id)) {
      return
    }

    this.round.playersAnswers.push({
      playerId: player.id,
      answerId,
      points: timeToPoint(this.round.startTime, question.time),
    })

    this.sendStatus(socket.id, STATUS.WAIT, {
      text: "Waiting for the players to answer",
    })

    socket
      .to(this.gameId)
      .emit("game:playerAnswer", this.round.playersAnswers.length)

    this.io.to(this.gameId).emit("game:totalPlayers", this.players.length)

    if (this.round.playersAnswers.length === this.players.length) {
      this.abortCooldown()
    }
    this.persist()
  }

  nextRound(socket: Socket) {
    if (!this.started) {
      return
    }

    if (socket.id !== this.manager.id) {
      return
    }

    if (!this.quizz.questions[this.round.currentQuestion + 1]) {
      return
    }

    this.round.currentQuestion += 1
    this.newRound()
  }

  abortRound(socket: Socket) {
    if (!this.started) {
      return
    }

    if (socket.id !== this.manager.id) {
      return
    }

    this.abortCooldown()
  }

  showLeaderboard() {
    const isLastRound =
      this.round.currentQuestion + 1 === this.quizz.questions.length

    if (isLastRound) {
      this.started = false

      this.broadcastStatus(STATUS.FINISHED, {
        subject: this.quizz.subject,
        top: this.leaderboard.slice(0, 3),
      })
      this.clearPersisted()

      return
    }

    const oldLeaderboard = this.tempOldLeaderboard
      ? this.tempOldLeaderboard
      : this.leaderboard

    this.sendStatus(this.manager.id, STATUS.SHOW_LEADERBOARD, {
      oldLeaderboard: oldLeaderboard.slice(0, 5),
      leaderboard: this.leaderboard.slice(0, 5),
    })

    this.tempOldLeaderboard = null
    this.persist()
  }

  endGame(socket: Socket, registry: typeof Registry.prototype) {
    if (socket.id !== this.manager.id) {
      return
    }
    this.started = false
    this.abortCooldown()
    this.io.to(this.gameId).emit("game:reset", "Game ended by manager")
    registry.removeGame(this.gameId)
  }

  playMedia(socket: Socket) {
    if (this.manager.id !== socket.id) {
      return
    }
    const question = this.quizz.questions[this.round.currentQuestion]
    if (
      !question?.media ||
      (question.media.type !== "audio" && question.media.type !== "video")
    ) {
      return
    }
    if (question.syncMedia === false) {
      return
    }
    this.mediaPlayNonce = (this.mediaPlayNonce || 0) + 1
    const startAt = Date.now() + 700
    this.io.to(this.gameId).emit("game:mediaPlay", {
      startAt,
      nonce: this.mediaPlayNonce,
    })
  }

  private async startAnswerPhase(question: any) {
    this.manualStartPending = false
    this.round.startTime = Date.now()

    this.broadcastStatus(STATUS.SELECT_ANSWER, {
      question: question.question,
      answers: question.answers,
      image: question.image,
      media: question.media,
      time: question.time,
      totalPlayer: this.players.length,
    })

    await this.startCooldown(question.time)

    if (!this.started) {
      return
    }

    this.showResults(question)
    this.persist()
  }
}

export default Game
