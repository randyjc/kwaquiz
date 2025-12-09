import { QuizzWithId } from "@rahoot/common/types/game"
import fs from "fs"
import { resolve } from "path"

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)

const inContainerPath = process.env.CONFIG_PATH

const getPath = (path: string = "") =>
  inContainerPath
    ? resolve(inContainerPath, path)
    : resolve(process.cwd(), "../../config", path)

export const getConfigPath = (path: string = "") => getPath(path)

class Config {
  static ensureBaseFolders() {
    const isConfigFolderExists = fs.existsSync(getPath())

    if (!isConfigFolderExists) {
      fs.mkdirSync(getPath())
    }

    const isQuizzExists = fs.existsSync(getPath("quizz"))

    if (!isQuizzExists) {
      fs.mkdirSync(getPath("quizz"))
    }

    const isMediaExists = fs.existsSync(getPath("media"))

    if (!isMediaExists) {
      fs.mkdirSync(getPath("media"))
    }

    const isThemeExists = fs.existsSync(getPath("theme.json"))

    if (!isThemeExists) {
      fs.writeFileSync(
        getPath("theme.json"),
        JSON.stringify(
          {
            brandName: "Rahoot",
            backgroundUrl: null,
          },
          null,
          2
        )
      )
    }
  }

  static init() {
    this.ensureBaseFolders()

    const isGameConfigExists = fs.existsSync(getPath("game.json"))

    if (!isGameConfigExists) {
      fs.writeFileSync(
        getPath("game.json"),
        JSON.stringify(
          {
            managerPassword: "PASSWORD",
            music: true,
          },
          null,
          2
        )
      )
    }

    const isQuizzExists = fs.readdirSync(getPath("quizz")).length > 0

    if (!isQuizzExists) {
      fs.mkdirSync(getPath("quizz"), { recursive: true })

      fs.writeFileSync(
        getPath("quizz/example.json"),
        JSON.stringify(
          {
            subject: "Example Quizz",
            questions: [
              {
                question: "What is good answer ?",
                answers: ["No", "Good answer", "No", "No"],
                solution: 1,
                cooldown: 5,
                time: 15,
              },
              {
                question: "What is good answer with image ?",
                answers: ["No", "No", "No", "Good answer"],
                image: "https://placehold.co/600x400.png",
                solution: 3,
                cooldown: 5,
                time: 20,
              },
              {
                question: "What is good answer with two answers ?",
                answers: ["Good answer", "No"],
                image: "https://placehold.co/600x400.png",
                solution: 0,
                cooldown: 5,
                time: 20,
              },
              {
                question: "Which soundtrack is this?",
                answers: [
                  "Nature sounds",
                  "Piano solo",
                  "Electronic beat",
                  "Chill guitar",
                ],
                media: {
                  type: "audio",
                  url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/4/4c/Beethoven_Moonlight_1st_movement.ogg/Beethoven_Moonlight_1st_movement.ogg.mp3",
                },
                solution: 1,
                cooldown: 5,
                time: 25,
              },
              {
                question: "Which landmark appears in this clip?",
                answers: [
                  "Eiffel Tower",
                  "Sydney Opera House",
                  "Statue of Liberty",
                  "Golden Gate Bridge",
                ],
                media: {
                  type: "video",
                  url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
                },
                solution: 2,
                cooldown: 5,
                time: 40,
              },
            ],
          },
          null,
          2
        )
      )
    }
  }

  static game() {
    const isExists = fs.existsSync(getPath("game.json"))

    if (!isExists) {
      throw new Error("Game config not found")
    }

    try {
      const config = fs.readFileSync(getPath("game.json"), "utf-8")

      const parsed = JSON.parse(config)
      if (process.env.MANAGER_PASSWORD) {
        parsed.managerPassword = process.env.MANAGER_PASSWORD
      }
      return parsed
    } catch (error) {
      console.error("Failed to read game config:", error)
    }

    return {}
  }

  static theme() {
    this.ensureBaseFolders()
    try {
      const raw = fs.readFileSync(getPath("theme.json"), "utf-8")
      return JSON.parse(raw)
    } catch (error) {
      console.error("Failed to read theme config:", error)
      return { brandName: "Rahoot", backgroundUrl: null }
    }
  }

  static quizz() {
    this.ensureBaseFolders()

    const files = fs
      .readdirSync(getPath("quizz"))
      .filter((file) => file.endsWith(".json"))

    const quizz: QuizzWithId[] = files.map((file) => {
      const data = fs.readFileSync(getPath(`quizz/${file}`), "utf-8")
      const config = JSON.parse(data)

      const id = file.replace(".json", "")

      return {
        id,
        ...config,
      }
    })

    return quizz || []
  }

  static getQuizz(id: string) {
    this.ensureBaseFolders()

    const filePath = getPath(`quizz/${id}.json`)

    if (!fs.existsSync(filePath)) {
      return null
    }

    const data = fs.readFileSync(filePath, "utf-8")

    return { id, ...JSON.parse(data) } as QuizzWithId
  }

  static saveQuizz(
    id: string | null,
    quizz: QuizzWithId | Omit<QuizzWithId, "id">
  ) {
    this.ensureBaseFolders()

    const slug = id
      ? slugify(id)
      : slugify((quizz as any).subject || "quizz")
    const finalId = slug.length > 0 ? slug : `quizz-${Date.now()}`
    const filePath = getPath(`quizz/${finalId}.json`)

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          subject: quizz.subject,
          questions: quizz.questions,
        },
        null,
        2
      )
    )

    return this.getQuizz(finalId)
  }

  static deleteQuizz(id: string) {
    this.ensureBaseFolders()
    const filePath = getPath(`quizz/${id}.json`)

    if (!fs.existsSync(filePath)) {
      return false
    }

    fs.unlinkSync(filePath)
    return true
  }

  static getMediaPath(fileName: string = "") {
    this.ensureBaseFolders()

    return getPath(fileName ? `media/${fileName}` : "media")
  }

  static saveTheme(theme: { brandName?: string; backgroundUrl?: string | null }) {
    this.ensureBaseFolders()
    const next = {
      brandName: theme.brandName || "Rahoot",
      backgroundUrl: theme.backgroundUrl ?? null,
    }

    fs.writeFileSync(getPath("theme.json"), JSON.stringify(next, null, 2))
    return next
  }
}

export default Config
