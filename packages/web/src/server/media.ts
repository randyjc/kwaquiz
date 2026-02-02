import type { QuestionMedia, QuizzWithId } from "@rahoot/common/types/game"
import Config from "@rahoot/socket/services/config"
import fs from "fs"
import { promises as fsp } from "fs"
import path from "path"

const toBytes = (valueMb: number) => valueMb * 1024 * 1024

const envMaxMb = Number(process.env.MEDIA_MAX_UPLOAD_MB || process.env.MAX_UPLOAD_MB || 50)
const MAX_UPLOAD_SIZE = Number.isFinite(envMaxMb) && envMaxMb > 0 ? toBytes(envMaxMb) : toBytes(50)

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg",
  ".mp3", ".m4a", ".aac", ".wav", ".ogg", ".oga", ".flac",
  ".mp4", ".m4v", ".mov", ".webm", ".ogv", ".mkv",
])

const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> = {
  "image/jpeg": [{ bytes: [0xff, 0xd8, 0xff] }],
  "image/png": [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  "image/gif": [{ bytes: [0x47, 0x49, 0x46, 0x38] }],
  "image/webp": [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }],
  "image/bmp": [{ bytes: [0x42, 0x4d] }],
  "audio/mpeg": [{ bytes: [0xff, 0xfb] }, { bytes: [0xff, 0xfa] }, { bytes: [0xff, 0xf3] }, { bytes: [0xff, 0xf2] }, { bytes: [0x49, 0x44, 0x33] }],
  "audio/wav": [{ bytes: [0x52, 0x49, 0x46, 0x46] }],
  "audio/ogg": [{ bytes: [0x4f, 0x67, 0x67, 0x53] }],
  "audio/flac": [{ bytes: [0x66, 0x4c, 0x61, 0x43] }],
  "audio/aac": [{ bytes: [0xff, 0xf1] }, { bytes: [0xff, 0xf9] }],
  "audio/mp4": [{ bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }],
  "video/mp4": [{ bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }],
  "video/webm": [{ bytes: [0x1a, 0x45, 0xdf, 0xa3] }],
  "video/ogg": [{ bytes: [0x4f, 0x67, 0x67, 0x53] }],
  "video/quicktime": [{ bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }],
  "video/x-matroska": [{ bytes: [0x1a, 0x45, 0xdf, 0xa3] }],
}

const validateMagicBytes = (buffer: Buffer, mime: string): boolean => {
  const signatures = MAGIC_BYTES[mime]
  if (!signatures) {
    return false
  }

  for (const sig of signatures) {
    const offset = sig.offset || 0
    if (buffer.length < offset + sig.bytes.length) continue

    let match = true
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[offset + i] !== sig.bytes[i]) {
        match = false
        break
      }
    }
    if (match) return true
  }

  return false
}

export type StoredMedia = {
  fileName: string
  url: string
  size: number
  mime: string
  type: QuestionMedia["type"]
  usedBy: {
    quizzId: string
    subject: string
    questionIndex: number
    question: string
  }[]
}

const ensureMediaFolder = () => {
  Config.ensureBaseFolders()
  const folder = Config.getMediaPath()

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true })
  }

  return folder
}

const inferMimeFromName = (fileName: string) => {
  const ext = path.extname(fileName).toLowerCase()

  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".flac": "audio/flac",
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".ogv": "video/ogg",
    ".mkv": "video/x-matroska",
  }

  return map[ext] || "application/octet-stream"
}

const inferMediaType = (mime: string): QuestionMedia["type"] | null => {
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("audio/")) return "audio"
  if (mime.startsWith("video/")) return "video"
  return null
}

const sanitizeFileName = (name: string) => {
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_")
  return safeName || `media-${Date.now()}`
}

const resolveStoredFileName = (fileName: string) => {
  const safeName = path.basename(fileName)

  if (safeName !== fileName) {
    throw new Error("Invalid file name")
  }

  return safeName
}

const usageIndex = (quizzList: QuizzWithId[]) => {
  const usage = new Map<string, StoredMedia["usedBy"]>()

  const recordUsage = (
    fileName: string | null,
    quizz: QuizzWithId,
    questionIndex: number,
    questionTitle: string,
  ) => {
    if (!fileName) return

    try {
      const safeName = resolveStoredFileName(fileName)
      const entries = usage.get(safeName) || []
      entries.push({
        quizzId: quizz.id,
        subject: quizz.subject,
        questionIndex,
        question: questionTitle,
      })
      usage.set(safeName, entries)
    } catch (error) {
      console.warn("Skipped invalid media reference", { fileName, error })
    }
  }

  quizzList.forEach((quizz) => {
    quizz.questions.forEach((question, idx) => {
      const mediaFile = (() => {
        if (question.media?.fileName) return question.media.fileName
        if (question.media?.url?.startsWith("/media/")) {
          try {
            return resolveStoredFileName(
              decodeURIComponent(question.media.url.split("/").pop() || ""),
            )
          } catch (error) {
            console.warn("Skipped invalid media url reference", {
              url: question.media.url,
              error,
            })
            return null
          }
        }
        return null
      })()

      const imageFile = (() => {
        if (!question.image?.startsWith("/media/")) return null
        try {
          return resolveStoredFileName(
            decodeURIComponent(question.image.split("/").pop() || ""),
          )
        } catch (error) {
          console.warn("Skipped invalid image url reference", {
            url: question.image,
            error,
          })
          return null
        }
      })()

      recordUsage(mediaFile, quizz, idx, question.question)
      recordUsage(imageFile, quizz, idx, question.question)
    })
  })

  return usage
}

export const listStoredMedia = async (): Promise<StoredMedia[]> => {
  const folder = ensureMediaFolder()
  const files = await fsp.readdir(folder)
  const quizz = Config.quizz()
  const usage = usageIndex(quizz)

  const entries = await Promise.all(
    files.map(async (fileName) => {
      const stats = await fsp.stat(path.join(folder, fileName))
      const mime = inferMimeFromName(fileName)
      const type = inferMediaType(mime) || "video"

      return {
        fileName,
        url: `/media/${encodeURIComponent(fileName)}`,
        size: stats.size,
        mime,
        type,
        usedBy: usage.get(fileName) || [],
      }
    }),
  )

  // Keep a stable order for repeatable responses
  return entries.sort((a, b) => a.fileName.localeCompare(b.fileName))
}

export const storeMediaFile = async (file: File): Promise<StoredMedia> => {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (buffer.byteLength > MAX_UPLOAD_SIZE) {
    throw new Error(
      `File is too large. Max ${Math.round(MAX_UPLOAD_SIZE / 1024 / 1024)}MB.`,
    )
  }

  const targetFolder = ensureMediaFolder()
  const incomingName = file.name || "upload"
  const safeName = sanitizeFileName(incomingName)
  const ext = path.extname(safeName).toLowerCase()

  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`File extension "${ext || "(none)"}" is not allowed`)
  }

  const inferredMime = inferMimeFromName(safeName)
  const mediaType = inferMediaType(inferredMime)

  if (!mediaType) {
    throw new Error("Unsupported media type")
  }

  // SVG files are XML-based and don't have magic bytes, but we still allow them
  // For other files, validate magic bytes to prevent disguised executables
  if (ext !== ".svg" && !validateMagicBytes(buffer, inferredMime)) {
    throw new Error("File content does not match its extension")
  }

  const baseName = path.basename(safeName, ext)

  let finalName = `${baseName}${ext}`
  let finalPath = path.join(targetFolder, finalName)
  let counter = 1

  while (fs.existsSync(finalPath)) {
    finalName = `${baseName}-${counter}${ext}`
    finalPath = path.join(targetFolder, finalName)
    counter += 1
  }

  await fsp.writeFile(finalPath, buffer)

  return {
    fileName: finalName,
    url: `/media/${encodeURIComponent(finalName)}`,
    size: buffer.byteLength,
    mime: inferredMime,
    type: mediaType,
    usedBy: [],
  }
}

export const deleteMediaFile = async (fileName: string) => {
  const folder = ensureMediaFolder()
  const safeName = resolveStoredFileName(fileName)
  const filePath = path.join(folder, safeName)

  if (!fs.existsSync(filePath)) {
    throw new Error("File not found")
  }

  const usage = usageIndex(Config.quizz())
  const usedBy = usage.get(safeName) || []

  if (usedBy.length > 0) {
    const details = usedBy
      .map(
        (entry) =>
          `${entry.subject || entry.quizzId} (question ${entry.questionIndex + 1})`,
      )
      .join(", ")

    throw new Error(`File is still used by: ${details}`)
  }

  await fsp.unlink(filePath)
}

export const mimeForStoredFile = (fileName: string) => inferMimeFromName(fileName)
