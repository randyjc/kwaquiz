import { Player } from "@rahoot/common/types/game"
import { StatusDataMap } from "@rahoot/common/types/game/status"
import { createStatus, Status } from "@rahoot/web/utils/createStatus"
import { create } from "zustand"

type ManagerStore<T> = {
  gameId: string | null
  status: Status<T> | null
  players: Player[]

  setGameId: (_gameId: string | null) => void
  setStatus: <K extends keyof T>(_name: K, _data: T[K]) => void
  resetStatus: () => void
  setPlayers: (_players: Player[] | ((_prev: Player[]) => Player[])) => void

  reset: () => void
}

const initialState = {
  gameId: null,
  status: null,
  players: [],
}

export const useManagerStore = create<ManagerStore<StatusDataMap>>((set) => ({
  ...initialState,

  setGameId: (gameId) => {
    try {
      if (gameId) {
        localStorage.setItem("last_manager_game_id", gameId)
      } else {
        localStorage.removeItem("last_manager_game_id")
      }
    } catch {}
    set({ gameId })
  },

  setStatus: (name, data) => set({ status: createStatus(name, data) }),
  resetStatus: () => set({ status: null }),

  setPlayers: (players) =>
    set((state) => ({
      players: typeof players === "function" ? players(state.players) : players,
    })),

  reset: () => {
    try {
      localStorage.removeItem("last_manager_game_id")
    } catch {}
    set(initialState)
  },
}))
