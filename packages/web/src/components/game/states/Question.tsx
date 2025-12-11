"use client"

import { CommonStatusDataMap } from "@rahoot/common/types/game/status"
import QuestionMedia from "@rahoot/web/components/game/QuestionMedia"
import { useEvent } from "@rahoot/web/contexts/socketProvider"
import { SFX_SHOW_SOUND } from "@rahoot/web/utils/constants"
import { useEffect, useState } from "react"
import useSound from "use-sound"

type Props = {
  data: CommonStatusDataMap["SHOW_QUESTION"]
  forceShowMedia?: boolean
}

const Question = ({
  data: { question, image, media, cooldown, showQuestion, viewerMode },
  forceShowMedia = false,
}: Props) => {
  const [sfxShow] = useSound(SFX_SHOW_SOUND, { volume: 0.5 })
  const [seconds, setSeconds] = useState(cooldown)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    sfxShow()
  }, [sfxShow])

  useEvent("game:cooldown", (sec) => {
    setSeconds(sec)
  })

  useEvent("game:cooldownPause", (isPaused) => {
    setPaused(isPaused)
  })

  const percent =
    cooldown > 0 ? Math.max(0, Math.min(100, (seconds / cooldown) * 100)) : 0

  const hideMedia = viewerMode && !forceShowMedia
  // Hide question text only for media questions in viewer mode; show text for non-media.
  const isMediaQuestion = !!media && !image
  const showQuestionText = !viewerMode || !isMediaQuestion

  return (
    <section className="relative mx-auto flex h-full w-full max-w-7xl flex-1 flex-col items-center px-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        {showQuestionText ? (
          <h2 className="anim-show text-center text-3xl font-bold text-white drop-shadow-lg md:text-4xl lg:text-5xl">
            {question}
          </h2>
        ) : (
          <div className="rounded-full bg-black/60 px-4 py-2 text-center text-lg font-semibold text-amber-200 shadow">
            Question hidden until answers
          </div>
        )}

        <QuestionMedia
          media={hideMedia ? undefined : media || (image ? { type: "image", url: image } : undefined)}
          alt={question}
        />
      </div>
      {cooldown > 0 ? (
        <div className="mb-20 h-4 w/full max-w-4xl self-start overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : (
        <div className="mb-20 rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white">
          Waiting for manager to start answers
        </div>
      )}
      {paused && (
        <div className="absolute bottom-6 right-6 rounded-md bg-black/60 px-3 py-1 text-sm font-semibold text-white">
          Paused
        </div>
      )}
    </section>
  )
}

export default Question
