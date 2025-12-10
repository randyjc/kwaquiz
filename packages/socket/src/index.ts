import { Server } from "@rahoot/common/types/game/socket"
import { inviteCodeValidator } from "@rahoot/common/validators/auth"
import { STATUS } from "@rahoot/common/types/game/status"
import env from "@rahoot/socket/env"
import Config from "@rahoot/socket/services/config"
import Game from "@rahoot/socket/services/game"
import Registry from "@rahoot/socket/services/registry"
import { loadSnapshot } from "@rahoot/socket/services/persistence"
import { withGame } from "@rahoot/socket/utils/game"
import { Server as ServerIO } from "socket.io"

const corsOrigins =
  process.env.NODE_ENV !== "production"
    ? "*"
    : env.WEB_ORIGIN === "*"
      ? "*"
      : [env.WEB_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"]

const io: Server = new ServerIO({
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: false,
  },
})
Config.init()

const registry = Registry.getInstance()
const port = 3001

console.log(`Socket server running on port ${port}`)
io.listen(Number(port))

io.on("connection", (socket) => {
  console.log(
    `A user connected: socketId: ${socket.id}, clientId: ${socket.handshake.auth.clientId}`
  )

  const ensureGame = async (gameId: string) => {
    let game = registry.getGameById(gameId)
    if (game) return game

    try {
      const snapshot = await loadSnapshot(gameId)
      if (snapshot) {
        const restored = await Game.fromSnapshot(io, snapshot)
        registry.addGame(restored)
        return restored
      }
    } catch (error) {
      console.error("Failed to restore game", error)
    }

    return null
  }

  socket.on("player:reconnect", ({ gameId }) => {
    const game = registry.getPlayerGame(gameId, socket.handshake.auth.clientId)

    if (game) {
      game.reconnect(socket)

      return
    }

    ensureGame(gameId).then((restored) => {
      if (restored) {
        restored.reconnect(socket)

        return
      }

      socket.emit("game:reset", "Game not found")
    })
  })

  socket.on("manager:reconnect", ({ gameId }) => {
    const game = registry.getManagerGame(
      gameId,
      socket.handshake.auth.clientId
    )

    if (game) {
      game.reconnect(socket)

      return
    }

    ensureGame(gameId).then((restored) => {
      if (restored) {
        restored.reconnect(socket)

        return
      }

      socket.emit("game:reset", "Game expired")
    })
  })

  socket.on("manager:auth", (password) => {
    try {
      const config = Config.game()

      if (password !== config.managerPassword) {
        socket.emit("manager:errorMessage", "Invalid password")

        return
      }

      socket.emit("manager:quizzList", Config.quizz())
    } catch (error) {
      console.error("Failed to read game config:", error)
      socket.emit("manager:errorMessage", "Failed to read game config")
    }
  })

  socket.on("manager:getQuizz", (quizzId) => {
    const quizz = Config.getQuizz(quizzId)

    if (!quizz) {
      socket.emit("manager:errorMessage", "Quizz not found")

      return
    }

    socket.emit("manager:quizzLoaded", quizz)
  })

  socket.on("manager:saveQuizz", ({ id, quizz }) => {
    if (!quizz?.subject || !Array.isArray(quizz?.questions)) {
      socket.emit("manager:errorMessage", "Invalid quizz payload")

      return
    }

    try {
      const saved = Config.saveQuizz(id || null, quizz)

      if (!saved) {
        socket.emit("manager:errorMessage", "Failed to save quizz")

        return
      }

      socket.emit("manager:quizzSaved", saved)
      socket.emit("manager:quizzList", Config.quizz())
    } catch (error) {
      console.error("Failed to save quizz", error)
      socket.emit("manager:errorMessage", "Failed to save quizz")
    }
  })

  socket.on("manager:deleteQuizz", ({ id }) => {
    if (!id) {
      socket.emit("manager:errorMessage", "Invalid quizz id")
      return
    }

    try {
      const deleted = Config.deleteQuizz(id)
      if (!deleted) {
        socket.emit("manager:errorMessage", "Quizz not found")
        return
      }

      socket.emit("manager:quizzDeleted", id)
      socket.emit("manager:quizzList", Config.quizz())
    } catch (error) {
      console.error("Failed to delete quizz", error)
      socket.emit("manager:errorMessage", "Failed to delete quizz")
    }
  })

  socket.on("game:create", (quizzId) => {
    const quizzList = Config.quizz()
    const quizz = quizzList.find((q) => q.id === quizzId)

    if (!quizz) {
      socket.emit("game:errorMessage", "Quizz not found")

      return
    }

    const game = new Game(io, socket, quizz)
    registry.addGame(game)
  })

  socket.on("player:join", (inviteCode) => {
    const result = inviteCodeValidator.safeParse(inviteCode)

    if (result.error) {
      socket.emit("game:errorMessage", result.error.issues[0].message)

      return
    }

    const game = registry.getGameByInviteCode(inviteCode)

    if (!game) {
      socket.emit("game:errorMessage", "Game not found")

      return
    }

    socket.emit("game:successRoom", game.gameId)
  })

  socket.on("player:login", ({ gameId, data }) =>
    withGame(gameId, socket, (game) => game.join(socket, data.username))
  )

  socket.on("manager:kickPlayer", ({ gameId, playerId }) =>
    withGame(gameId, socket, (game) => game.kickPlayer(socket, playerId))
  )

  socket.on("manager:startGame", ({ gameId }) =>
    withGame(gameId, socket, (game) => game.start(socket))
  )

  socket.on("player:selectedAnswer", ({ gameId, data }) =>
    withGame(gameId, socket, (game) =>
      game.selectAnswer(socket, data.answerKey)
    )
  )

  socket.on("manager:abortQuiz", ({ gameId }) =>
    withGame(gameId, socket, (game) => game.abortRound(socket))
  )

  socket.on("manager:pauseCooldown", ({ gameId }) =>
    withGame(gameId, socket, (game) => game.pauseCooldown(socket))
  )

  socket.on("manager:resumeCooldown", ({ gameId }) =>
    withGame(gameId, socket, (game) => game.resumeCooldown(socket))
  )

  socket.on("manager:playMedia", ({ gameId }) =>
    withGame(gameId, socket, (game) => game.playMedia(socket))
  )

  socket.on("manager:setQuestionPreview", ({ gameId, show }) =>
    withGame(gameId, socket, (game) => game.setQuestionPreview(socket, show))
  )

  socket.on("manager:setViewerMode", ({ gameId, enabled }) =>
    withGame(gameId, socket, (game) => game.setViewerMode(socket, enabled))
  )

  socket.on("manager:setBreak", ({ gameId, active }) =>
    withGame(gameId, socket, (game) => game.setBreak(socket, active))
  )

  socket.on("manager:endGame", ({ gameId }) =>
    withGame(gameId, socket, (game) => game.endGame(socket, registry))
  )

  socket.on("manager:nextQuestion", ({ gameId }) =>
    withGame(gameId, socket, (game) => game.nextRound(socket))
  )

  socket.on("manager:skipQuestionIntro", ({ gameId }) =>
    withGame(gameId, socket, (game) => game.skipQuestionIntro(socket))
  )

  socket.on("manager:showLeaderboard", ({ gameId }) =>
    withGame(gameId, socket, (game) => game.showLeaderboard())
  )

  socket.on("disconnect", () => {
    console.log(`A user disconnected : ${socket.id}`)

    const managerGame = registry.getGameByManagerSocketId(socket.id)

    if (managerGame) {
      managerGame.manager.connected = false
      registry.markGameAsEmpty(managerGame)

      if (!managerGame.started) {
        console.log("Reset game (manager disconnected)")
        managerGame.abortCooldown()
        io.to(managerGame.gameId).emit("game:reset", "Manager disconnected")
        registry.removeGame(managerGame.gameId)

        return
      }
    }

    const game = registry.getGameByPlayerSocketId(socket.id)

    if (!game) {
      return
    }

    const player = game.players.find((p) => p.id === socket.id)

    if (!player) {
      return
    }

    player.connected = false
    io.to(game.gameId).emit("game:totalPlayers", game.players.length)
    io.to(game.manager.id).emit("manager:players", game.players)
  })

  socket.on("viewer:join", ({ inviteCode, password }) => {
    const config = Config.game()
    if (password !== config.managerPassword) {
      socket.emit("game:errorMessage", "Invalid password")
      return
    }

    const result = inviteCodeValidator.safeParse(inviteCode)
    if (result.error) {
      socket.emit("game:errorMessage", result.error.issues[0].message)
      return
    }

    const game = registry.getGameByInviteCode(inviteCode)
    if (!game) {
      socket.emit("game:errorMessage", "Game not found")
      return
    }

    socket.join(game.gameId)
    socket.join(`${game.gameId}:viewers`)
    const currentStatus = game.lastBroadcastStatus
    if (currentStatus) {
      socket.emit("viewer:joined", { gameId: game.gameId, status: currentStatus })
    } else {
      socket.emit("viewer:joined", {
        gameId: game.gameId,
        status: {
          name: STATUS.WAIT,
          data: { text: "Waiting for the manager" },
        },
      })
    }
  })
})

process.on("SIGINT", () => {
  Registry.getInstance().cleanup()
  process.exit(0)
})

process.on("SIGTERM", () => {
  Registry.getInstance().cleanup()
  process.exit(0)
})
