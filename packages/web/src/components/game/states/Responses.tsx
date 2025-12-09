"use client"

import { ManagerStatusDataMap } from "@rahoot/common/types/game/status"
import AnswerButton from "@rahoot/web/components/AnswerButton"
import QuestionMedia from "@rahoot/web/components/game/QuestionMedia"
import {
  ANSWERS_COLORS,
  ANSWERS_ICONS,
  SFX_ANSWERS_MUSIC,
  SFX_RESULTS_SOUND,
} from "@rahoot/web/utils/constants"
import { calculatePercentages } from "@rahoot/web/utils/score"
import clsx from "clsx"
import { useEffect, useState } from "react"
import useSound from "use-sound"

type Props = {
  data: ManagerStatusDataMap["SHOW_RESPONSES"]
}

const Responses = ({
  data: { question, answers, responses, correct, image, media },
}: Props) => {
  const [percentages, setPercentages] = useState<Record<string, string>>({})
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [isMediaPlaying, setIsMediaPlaying] = useState(false)
  const correctSet = Array.isArray(correct) ? correct : [correct]

  const [sfxResults] = useSound(SFX_RESULTS_SOUND, {
    volume: 0.2,
  })

  const [playMusic, { stop: stopMusic, sound: answersMusic }] = useSound(
    SFX_ANSWERS_MUSIC,
    {
      volume: 0.2,
      onplay: () => {
        setIsMusicPlaying(true)
      },
      onend: () => {
        setIsMusicPlaying(false)
      },
    },
  )

  useEffect(() => {
    stopMusic()
    sfxResults()

    setPercentages(calculatePercentages(responses))
  }, [responses, playMusic, stopMusic, sfxResults])

  useEffect(() => {
    if (!isMusicPlaying) {
      playMusic()
    }
  }, [isMusicPlaying, playMusic])

  useEffect(() => {
    if (!answersMusic) {
      return
    }

    answersMusic.volume(isMediaPlaying ? 0.05 : 0.2)
  }, [answersMusic, isMediaPlaying])

  useEffect(() => {
    stopMusic()
  }, [playMusic, stopMusic])

  return (
    <div className="flex h-full flex-1 flex-col justify-between">
      <div className="mx-auto inline-flex h-full w-full max-w-7xl flex-1 flex-col items-center justify-center gap-5">
        <h2 className="text-center text-2xl font-bold text-white drop-shadow-lg md:text-4xl lg:text-5xl">
          {question}
        </h2>

        <QuestionMedia
          media={media || (image ? { type: "image", url: image } : undefined)}
          alt={question}
          onPlayChange={(playing) => setIsMediaPlaying(playing)}
        />

        <div
          className={`mt-8 grid h-48 w-full max-w-5xl gap-4 px-2`}
          style={{ gridTemplateColumns: `repeat(${answers.length}, 1fr)` }}
        >
          {answers.map((label, key) => {
            const votes = responses[key] || 0
            const percent = percentages[key] || "0%"
            const isCorrect = correctSet.includes(key)

            return (
              <div
                key={key}
                className={clsx(
                  "relative flex flex-col justify-end self-end overflow-hidden rounded-md border shadow",
                  isCorrect ? "border-green-400 ring-4 ring-green-300/50" : "border-white/40",
                  ANSWERS_COLORS[key],
                )}
                style={{ height: percent }}
                title={label}
              >
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative flex w-full flex-col items-center gap-1 bg-black/25 px-2 py-2 text-white">
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-lg font-bold">{votes} ({percent})</span>
                  <span
                    className={clsx(
                      "rounded-full px-3 py-0.5 text-xs font-bold uppercase",
                      isCorrect ? "bg-green-500 text-white" : "bg-black/40 text-white",
                    )}
                  >
                    {isCorrect ? "Correct" : "Not correct"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="mx-auto mb-6 grid w-full max-w-7xl grid-cols-2 gap-2 px-2 text-lg font-bold text-white md:text-xl">
          {answers.map((answer, key) => {
            const votes = responses[key] || 0
            const totalVotes = Object.values(responses).reduce(
              (acc, val) => acc + (val || 0),
              0,
            )
            const percent = totalVotes ? Math.round((votes / totalVotes) * 100) : 0
            const isCorrect = correctSet.includes(key)

            return (
              <div key={key} className="flex flex-col gap-2 rounded-md bg-white/10 p-2 shadow">
                <AnswerButton
                  className={clsx(
                    ANSWERS_COLORS[key],
                    "w-full justify-between",
                    !isCorrect && "opacity-70",
                  )}
                  icon={ANSWERS_ICONS[key]}
                >
                  <span>{answer}</span>
                  <span
                    className={clsx(
                      "rounded-full px-3 py-0.5 text-sm font-bold",
                      isCorrect ? "bg-green-500 text-white" : "bg-black/30 text-white",
                    )}
                  >
                    {isCorrect ? "Correct" : "Wrong"}
                  </span>
                </AnswerButton>
                <div className="flex items-center justify-between text-sm text-gray-100">
                  <span>
                    Votes: <strong>{votes}</strong>
                  </span>
                  <span>
                    {percent}
                    %
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Responses
