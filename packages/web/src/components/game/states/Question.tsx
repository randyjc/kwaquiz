"use client"

import { CommonStatusDataMap } from "@rahoot/common/types/game/status"
import QuestionMedia from "@rahoot/web/components/game/QuestionMedia"
import { useEvent } from "@rahoot/web/contexts/socketProvider"
import { SFX_SHOW_SOUND } from "@rahoot/web/utils/constants"
import { useEffect, useState } from "react"
import useSound from "use-sound"

type Props = {
  data: CommonStatusDataMap["SHOW_QUESTION"]
}

const Question = ({ data: { question, image, media, cooldown } }: Props) => {
  const [sfxShow] = useSound(SFX_SHOW_SOUND, { volume: 0.5 })
  const [seconds, setSeconds] = useState(cooldown)
  const [paused, setPaused] = useState(false)
  const [playRequest, setPlayRequest] = useState(0)

  useEffect(() => {
    sfxShow()
  }, [sfxShow])

  useEvent("game:cooldown", (sec) => {
    setSeconds(sec)
  })

  useEvent("game:cooldownPause", (isPaused) => {
    setPaused(isPaused)
  })

  useEvent("game:mediaPlay", () => {
    setPlayRequest((prev) => prev + 1)
  })

  const percent = Math.max(0, Math.min(100, (seconds / cooldown) * 100))

  return (
    <section className="relative mx-auto flex h-full w-full max-w-7xl flex-1 flex-col items-center px-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <h2 className="anim-show text-center text-3xl font-bold text-white drop-shadow-lg md:text-4xl lg:text-5xl">
          {question}
        </h2>

        <QuestionMedia
          media={media || (image ? { type: "image", url: image } : undefined)}
          alt={question}
          playRequest={playRequest}
        />
      </div>
      <div className="mb-20 h-4 w-full max-w-4xl self-start overflow-hidden rounded-full bg-white/30">
        <div
          className="h-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      {paused && (
        <div className="absolute bottom-6 right-6 rounded-md bg-black/60 px-3 py-1 text-sm font-semibold text-white">
          Paused
        </div>
      )}
    </section>
  )
}

export default Question
