export type Player = {
  id: string
  clientId: string
  connected: boolean
  username: string
  points: number
}

export type Answer = {
  playerId: string
  answerId: number
  points: number
}

export type Quizz = {
  subject: string
  questions: {
    question: string
    image?: string
    media?: QuestionMedia
    answers: string[]
    solution: number
    cooldown: number
    time: number
    syncMedia?: boolean
  }[]
}

export type QuestionMedia =
  | { type: "image"; url: string; fileName?: string }
  | { type: "audio"; url: string; fileName?: string }
  | { type: "video"; url: string; fileName?: string }

export type QuizzWithId = Quizz & { id: string }

export type GameUpdateQuestion = {
  current: number
  total: number
}
