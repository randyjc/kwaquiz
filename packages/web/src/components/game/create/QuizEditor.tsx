"use client"

import type { QuestionMedia, QuizzWithId } from "@rahoot/common/types/game"
import Button from "@rahoot/web/components/Button"
import Input from "@rahoot/web/components/Input"
import { useEvent, useSocket } from "@rahoot/web/contexts/socketProvider"
import clsx from "clsx"
import { useCallback, useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"

type Props = {
  quizzList: QuizzWithId[]
  onBack: () => void
  onListUpdate: (_quizz: QuizzWithId[]) => void
  onBreakToggle?: (_active: boolean) => void
  gameId?: string | null
}

type EditableQuestion = QuizzWithId["questions"][number]

type MediaLibraryItem = {
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

const blankQuestion = (): EditableQuestion => ({
  question: "",
  answers: ["", ""],
  solution: 0,
  cooldown: 5,
  time: 20,
  syncMedia: true,
})

const mediaTypes: QuestionMedia["type"][] = ["image", "audio", "video"]

const acceptByType: Record<QuestionMedia["type"], string> = {
  image: "image/*",
  audio: "audio/*",
  video: "video/*",
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** i

  return `${value.toFixed(value >= 10 || value % 1 === 0 ? 0 : 1)} ${units[i]}`
}

const QuizEditor = ({
  quizzList,
  onBack,
  onListUpdate,
  onBreakToggle,
  gameId,
}: Props) => {
  const { socket } = useSocket()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<QuizzWithId | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryItem[]>([])
  const [uploading, setUploading] = useState<Record<number, boolean>>({})
  const [deleting, setDeleting] = useState<Record<number, boolean>>({})
  const [refreshingLibrary, setRefreshingLibrary] = useState(false)
  const [probing, setProbing] = useState<Record<number, boolean>>({})

  useEvent("manager:quizzLoaded", (quizz) => {
    setDraft(quizz)
    setLoading(false)
  })

  useEvent("manager:quizzSaved", (quizz) => {
    toast.success("Quiz saved")
    setDraft(quizz)
    setSelectedId(quizz.id)
    setSaving(false)
    refreshMediaLibrary()
  })

  useEvent("manager:quizzDeleted", (id) => {
    toast.success("Quiz deleted")
    if (selectedId === id) {
      setSelectedId(null)
      setDraft(null)
    }
    refreshMediaLibrary()
  })

  useEvent("manager:quizzList", (list) => {
    onListUpdate(list)
  })

  useEvent("manager:errorMessage", (message) => {
    toast.error(message)
    setSaving(false)
    setLoading(false)
  })

  const refreshMediaLibrary = useCallback(async () => {
    setRefreshingLibrary(true)
    try {
      const res = await fetch("/api/media", { cache: "no-store" })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to load media library")
      }

      setMediaLibrary(data.media || [])
    } catch (error) {
      console.error("Failed to fetch media library", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to load media library",
      )
    } finally {
      setRefreshingLibrary(false)
    }
  }, [])

  useEffect(() => {
    refreshMediaLibrary()
  }, [refreshMediaLibrary])

  const handleLoad = (id: string) => {
    setSelectedId(id)
    setLoading(true)
    socket?.emit("manager:getQuizz", id)
  }

  const handleNew = () => {
    setSelectedId(null)
    setDraft({
      id: "",
      subject: "",
      questions: [blankQuestion()],
    })
  }

  const handleDeleteQuizz = () => {
    if (!selectedId) return
    if (!window.confirm("Delete this quiz?")) return
    setSaving(true)
    socket?.emit("manager:deleteQuizz", { id: selectedId })
  }

  const updateQuestion = (
    index: number,
    patch: Partial<EditableQuestion>,
  ) => {
    if (!draft) return
    const nextQuestions = [...draft.questions]
    nextQuestions[index] = { ...nextQuestions[index], ...patch }
    setDraft({ ...draft, questions: nextQuestions })
  }

  const updateAnswer = (qIndex: number, aIndex: number, value: string) => {
    if (!draft) return
    const nextQuestions = [...draft.questions]
    const nextAnswers = [...nextQuestions[qIndex].answers]
    nextAnswers[aIndex] = value
    nextQuestions[qIndex] = { ...nextQuestions[qIndex], answers: nextAnswers }
    setDraft({ ...draft, questions: nextQuestions })
  }

  const addAnswer = (qIndex: number) => {
    if (!draft) return
    const nextQuestions = [...draft.questions]
    if (nextQuestions[qIndex].answers.length >= 4) {
      return
    }
    nextQuestions[qIndex] = {
      ...nextQuestions[qIndex],
      answers: [...nextQuestions[qIndex].answers, ""],
    }
    setDraft({ ...draft, questions: nextQuestions })
  }

  const removeAnswer = (qIndex: number, aIndex: number) => {
    if (!draft) return
    const nextQuestions = [...draft.questions]
    const currentAnswers = [...nextQuestions[qIndex].answers]
    if (currentAnswers.length <= 2) {
      return
    }
    currentAnswers.splice(aIndex, 1)
    let nextSolution = nextQuestions[qIndex].solution
    if (nextSolution >= currentAnswers.length) {
      nextSolution = currentAnswers.length - 1
    }
    nextQuestions[qIndex] = {
      ...nextQuestions[qIndex],
      answers: currentAnswers,
      solution: nextSolution,
    }
    setDraft({ ...draft, questions: nextQuestions })
  }

  const addQuestion = () => {
    if (!draft) return
    setDraft({ ...draft, questions: [...draft.questions, blankQuestion()] })
  }

  const removeQuestion = (index: number) => {
    if (!draft || draft.questions.length <= 1) return
    const nextQuestions = draft.questions.filter((_, i) => i !== index)
    setDraft({ ...draft, questions: nextQuestions })
  }

  const setQuestionMedia = (qIndex: number, media?: QuestionMedia) => {
    if (!draft) return
    updateQuestion(qIndex, {
      media,
      image: media?.type === "image" ? media.url : undefined,
      syncMedia:
        media && (media.type === "audio" || media.type === "video")
          ? draft.questions[qIndex].syncMedia !== false
          : draft.questions[qIndex].syncMedia,
    })
  }

  const getMediaFileName = (media?: QuestionMedia | null) => {
    if (!media) return null
    if (media.fileName) return media.fileName
    if (media.url?.startsWith("/media/")) {
      return decodeURIComponent(media.url.split("/").pop() || "")
    }
    return null
  }

  const getLibraryEntry = (media?: QuestionMedia | null) => {
    const fileName = getMediaFileName(media)
    if (!fileName) return null

    return mediaLibrary.find((item) => item.fileName === fileName) || null
  }

  const handleMediaType = (qIndex: number, type: QuestionMedia["type"] | "") => {
    if (!draft) return
    const question = draft.questions[qIndex]

    if (type === "") {
      setQuestionMedia(qIndex, undefined)
      return
    }

    const nextMedia =
      question.media?.type === type
        ? { ...question.media, type }
        : { type, url: "" }

    setQuestionMedia(qIndex, nextMedia)
  }

  const handleMediaUrlChange = (qIndex: number, url: string) => {
    if (!draft) return
    const question = draft.questions[qIndex]

    if (!question.media?.type) {
      toast.error("Select a media type before setting a URL")
      return
    }

    if (!url) {
      setQuestionMedia(qIndex, undefined)
      return
    }

    const nextMedia: QuestionMedia = {
      type: question.media.type,
      url,
      fileName: question.media.fileName,
    }

    setQuestionMedia(qIndex, nextMedia)
  }

  const handleSyncMediaToggle = (qIndex: number, value: boolean) => {
    if (!draft) return
    const question = draft.questions[qIndex]
    if (!question.media || (question.media.type !== "audio" && question.media.type !== "video")) {
      toast.error("Sync is only available for audio/video questions")
      return
    }
    updateQuestion(qIndex, { syncMedia: value })
  }

  const clearQuestionMedia = (qIndex: number) => {
    setQuestionMedia(qIndex, undefined)
  }

  const probeMediaDuration = async (url: string, type: QuestionMedia["type"]) => {
    if (!url || (type !== "audio" && type !== "video")) {
      return null
    }

    try {
      const el = document.createElement(type)
      el.crossOrigin = "anonymous"
      el.preload = "metadata"
      el.src = url
      el.load()

      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          el.onloadedmetadata = null
          el.onloadeddata = null
          el.oncanplaythrough = null
          el.onerror = null
        }
        const done = () => {
          cleanup()
          resolve()
        }
        el.onloadedmetadata = done
        el.onloadeddata = done
        el.oncanplaythrough = done
        el.onerror = () => {
          cleanup()
          reject(new Error("Failed to load media metadata"))
        }
        // safety timeout
        setTimeout(() => {
          cleanup()
          reject(new Error("Timed out loading media metadata"))
        }, 5000)
      })

      const duration = el.duration
      return Number.isFinite(duration) && duration > 0 ? duration : null
    } catch (error) {
      console.warn("Failed to probe media duration", error)
      return null
    }
  }

  const adjustTimingWithMedia = async (
    qIndex: number,
    media: QuestionMedia | undefined,
  ) => {
    if (!draft || !media?.url || !media.type || media.type === "image") {
      return
    }

    setProbing((prev) => ({ ...prev, [qIndex]: true }))

    try {
      const duration = await probeMediaDuration(media.url, media.type)
      if (!duration || !draft) {
        return
      }

      const rounded = Math.ceil(duration)
      const buffer = 3
      const minCooldown = rounded
      const minAnswer = rounded + buffer
      const question = draft.questions[qIndex]

      const nextCooldown = Math.max(question.cooldown, minCooldown)
      const nextTime = Math.max(question.time, minAnswer)

      if (nextCooldown !== question.cooldown || nextTime !== question.time) {
        updateQuestion(qIndex, {
          cooldown: nextCooldown,
          time: nextTime,
        })
        toast.success(
          `Adjusted timing to media length (~${rounded}s, answers ${nextTime}s)`,
          { id: `timing-${qIndex}` },
        )
      }
    } finally {
      setProbing((prev) => ({ ...prev, [qIndex]: false }))
    }
  }

  const handleMediaUpload = async (qIndex: number, file: File) => {
    if (!draft) return
    const question = draft.questions[qIndex]

    if (!question.media?.type) {
      toast.error("Select a media type before uploading")
      return
    }

    setUploading((prev) => ({ ...prev, [qIndex]: true }))

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/media", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload media")
      }

      const uploaded = data.media as MediaLibraryItem
      const type = uploaded.type

      setQuestionMedia(qIndex, {
        type,
        url: uploaded.url,
        fileName: uploaded.fileName,
      })
      toast.success("Media uploaded")
      refreshMediaLibrary()
    } catch (error) {
      console.error("Upload failed", error)
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setUploading((prev) => ({ ...prev, [qIndex]: false }))
    }
  }

  const handleDeleteMediaFile = async (qIndex: number) => {
    if (!draft) return
    const question = draft.questions[qIndex]
    const fileName = getMediaFileName(question.media)

    if (!fileName) {
      toast.error("No stored file to delete")
      return
    }

    setDeleting((prev) => ({ ...prev, [qIndex]: true }))

    try {
      const res = await fetch(`/api/media/${encodeURIComponent(fileName)}`, {
        method: "DELETE",
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete file")
      }

      toast.success("File deleted")
      clearQuestionMedia(qIndex)
      refreshMediaLibrary()
    } catch (error) {
      console.error("Failed to delete file", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete file")
    } finally {
      setDeleting((prev) => ({ ...prev, [qIndex]: false }))
    }
  }

  const handleSave = () => {
    if (!draft) return
    setSaving(true)
    socket?.emit("manager:saveQuizz", {
      id: draft.id || null,
      quizz: {
        subject: draft.subject,
        questions: draft.questions,
      },
    })
  }

  const selectedLabel = useMemo(() => {
    if (!selectedId) return "New quiz"
    const found = quizzList.find((q) => q.id === selectedId)
    return found ? `Editing: ${found.subject}` : `Editing: ${selectedId}`
  }, [quizzList, selectedId])

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 rounded-md bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={onBack} className="bg-gray-700">
            Back
          </Button>
          <Button onClick={handleNew} className="bg-blue-600">
            New quiz
          </Button>
          {selectedId && (
            <Button className="bg-red-600" onClick={handleDeleteQuizz} disabled={saving}>
              Delete quiz
            </Button>
          )}
          {onBreakToggle && gameId && (
            <>
              <Button className="bg-amber-500" onClick={() => onBreakToggle(true)}>
                Break
              </Button>
              <Button className="bg-green-600" onClick={() => onBreakToggle(false)}>
                Resume
              </Button>
            </>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? "Saving..." : "Save quiz"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-gray-200 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-600">
            Existing quizzes:
          </span>
          {quizzList.map((quizz) => (
            <button
              key={quizz.id}
              onClick={() => handleLoad(quizz.id)}
              className={clsx(
                "rounded-sm border px-3 py-1 text-sm font-semibold",
                selectedId === quizz.id
                  ? "border-primary text-primary"
                  : "border-gray-300",
              )}
            >
              {quizz.subject}
            </button>
          ))}
        </div>
      </div>

      {!draft && (
        <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-gray-600">
          {loading ? "Loading quiz..." : "Select a quiz to edit or create a new one."}
        </div>
      )}

      {draft && (
        <div className="space-y-4">
          <div className="rounded-md border border-gray-200 p-4">
            <div className="mb-2 text-sm font-semibold text-gray-700">
              {selectedLabel}
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-gray-600">Subject</span>
              <Input
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                placeholder="Quiz title"
              />
            </label>
          </div>

          {draft.questions.map((question, qIndex) => {
            const libraryEntry = getLibraryEntry(question.media)
            const mediaFileName = getMediaFileName(question.media)
            const isUploading = uploading[qIndex]
            const isDeleting = deleting[qIndex]

            return (
              <div
                key={qIndex}
                className="rounded-md border border-gray-200 p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-lg font-semibold text-gray-800">
                    Question {qIndex + 1}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="bg-red-500"
                      onClick={() => removeQuestion(qIndex)}
                      disabled={draft.questions.length <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-gray-600">Prompt</span>
                    <Input
                      value={question.question}
                      onChange={(e) =>
                        updateQuestion(qIndex, { question: e.target.value })
                      }
                      placeholder="Enter the question"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-gray-600">
                        Cooldown (s)
                      </span>
                      <Input
                        type="number"
                        value={question.cooldown}
                        onChange={(e) =>
                          updateQuestion(qIndex, {
                            cooldown: Number(e.target.value || 0),
                          })
                        }
                        min={0}
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-gray-600">
                        Answer time (s)
                      </span>
                      <Input
                        type="number"
                        value={question.time}
                        onChange={(e) =>
                          updateQuestion(qIndex, { time: Number(e.target.value || 0) })
                        }
                        min={5}
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-gray-600">
                      Media type
                    </span>
                    <select
                      className="rounded-sm border border-gray-300 p-2 font-semibold"
                      value={question.media?.type || ""}
                      onChange={(e) =>
                        handleMediaType(qIndex, e.target.value as QuestionMedia["type"] | "")
                      }
                    >
                      <option value="">None</option>
                      {mediaTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>

                <div className="flex flex-col gap-2 rounded-md border border-gray-200 p-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-gray-600">
                    <span>Media upload</span>
                    <span className="text-xs text-gray-500">
                      {isUploading
                        ? "Uploading..."
                        : probing[qIndex]
                          ? "Probing..."
                        : refreshingLibrary
                          ? "Refreshing..."
                          : mediaFileName
                            ? "Stored"
                            : "Not saved"}
                  </span>
                    </div>
                    <input
                      type="file"
                      accept={
                        question.media?.type ? acceptByType[question.media.type] : undefined
                      }
                      disabled={!question.media?.type || isUploading}
                      className="rounded-sm border border-dashed border-gray-300 p-2 text-sm"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleMediaUpload(qIndex, file)
                          e.target.value = ""
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500">
                      Files are stored locally and served from /media. Pick a type first.
                    </p>

                    {(question.media?.type === "audio" || question.media?.type === "video") && (
                      <div className="flex items-center gap-2 rounded-sm bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={question.syncMedia !== false}
                          onChange={(e) => handleSyncMediaToggle(qIndex, e.target.checked)}
                        />
                        <span>Manager controls media playback</span>
                      </div>
                    )}

                    {question.media && (
                      <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                        <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                          <span>
                            {mediaFileName || question.media.url || "No file yet"}
                          </span>
                          {libraryEntry && (
                            <span className="text-xs text-gray-500">
                              {formatBytes(libraryEntry.size)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {libraryEntry
                            ? `Used in ${libraryEntry.usedBy.length} question${
                                libraryEntry.usedBy.length === 1 ? "" : "s"
                              }`
                            : question.media.url
                              ? "External media URL"
                              : "Upload a file or paste a URL"}
                        </div>
                      </div>
                    )}

                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-600">
                      Or paste an external URL
                    </span>
                    <Input
                        value={question.media?.url || question.image || ""}
                        onChange={(e) => handleMediaUrlChange(qIndex, e.target.value)}
                        placeholder="https://..."
                        disabled={!question.media?.type}
                      />
                    <span className="text-xs text-gray-500">
                      Tip: set answer time longer than the clip duration.
                    </span>
                  </label>

                  {question.media?.type !== "image" && question.media?.url && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        className="bg-gray-800"
                        onClick={() => adjustTimingWithMedia(qIndex, question.media)}
                        disabled={probing[qIndex]}
                      >
                        {probing[qIndex] ? "Probing..." : "Set timing from media"}
                      </Button>
                      <span className="text-xs text-gray-500">
                        Probes audio/video duration and bumps cooldown/answer time if needed.
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="bg-gray-700"
                      onClick={() => clearQuestionMedia(qIndex)}
                      disabled={!question.media}
                      >
                        Clear from question
                      </Button>
                      <Button
                        className="bg-red-500"
                        onClick={() => handleDeleteMediaFile(qIndex)}
                        disabled={!mediaFileName || isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete file"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Answers</span>
                    <Button
                      className="bg-blue-600"
                      onClick={() => addAnswer(qIndex)}
                      disabled={question.answers.length >= 4}
                    >
                      Add answer
                    </Button>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    {question.answers.map((answer, aIndex) => (
                      <div
                        key={aIndex}
                        className={clsx(
                          "flex items-center gap-2 rounded-md border p-2",
                          question.solution === aIndex
                            ? "border-green-500"
                            : "border-gray-200",
                        )}
                      >
                        <input
                          type="radio"
                          name={`solution-${qIndex}`}
                          checked={question.solution === aIndex}
                          onChange={() =>
                            updateQuestion(qIndex, { solution: aIndex })
                          }
                        />
                        <Input
                          className="flex-1"
                          value={answer}
                          onChange={(e) =>
                            updateAnswer(qIndex, aIndex, e.target.value)
                          }
                          placeholder={`Answer ${aIndex + 1}`}
                        />
                        <button
                          className="rounded-sm px-2 py-1 text-sm font-semibold text-red-500"
                          onClick={() => removeAnswer(qIndex, aIndex)}
                          disabled={question.answers.length <= 2}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}

          <div className="flex justify-center">
            <Button className="bg-blue-600" onClick={addQuestion}>
              Add question
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuizEditor
