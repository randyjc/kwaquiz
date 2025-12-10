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

const Question = ({
  data: { question, image, media, cooldown, showQuestion, syncMedia },
}: Props) => {
  const [sfxShow] = useSound(SFX_SHOW_SOUND, { volume: 0.5 })
  const [seconds, setSeconds] = useState(cooldown)
  const [paused, setPaused] = useState(false)
  const [playRequest, setPlayRequest] = useState<{ nonce: number; startAt: number } | null>(null)

  useEffect(() => {
    sfxShow()
  }, [sfxShow])

  useEvent("game:cooldown", (sec) => {
    setSeconds(sec)
  })

  useEvent("game:cooldownPause", (isPaused) => {
    setPaused(isPaused)
  })

  useEvent("game:mediaPlay", ({ nonce, startAt }) => {
    setPlayRequest({ nonce, startAt })
  })

  const percent =
    cooldown > 0 ? Math.max(0, Math.min(100, (seconds / cooldown) * 100)) : 0

  return (
    <section className="relative mx-auto flex h-full w-full max-w-7xl flex-1 flex-col items-center px-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        {showQuestion ? (
          <h2 className="anim-show text-center text-3xl font-bold text-white drop-shadow-lg md:text-4xl lg:text-5xl">
            {question}
          </h2>
        ) : (
          <div className="rounded-full bg-black/60 px-4 py-2 text-center text-lg font-semibold text-amber-200 shadow">
            Question hidden until answers
          </div>
        )}

        <QuestionMedia
          media={media || (image ? { type: "image", url: image } : undefined)}
          alt={question}
          key={media?.url || image || "question-media"}
          playRequest={playRequest ?? undefined}
          requireUserEnable={!!media && media.type !== "image" && syncMedia !== false}
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
