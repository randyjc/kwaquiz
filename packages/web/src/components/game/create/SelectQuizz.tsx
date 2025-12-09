import { QuizzWithId } from "@rahoot/common/types/game"
import Button from "@rahoot/web/components/Button"
import clsx from "clsx"
import { useState } from "react"
import toast from "react-hot-toast"

type Props = {
  quizzList: QuizzWithId[]
  onSelect: (_id: string) => void
  onManage?: () => void
  onMedia?: () => void
  onTheme?: () => void
  resumeGameId?: string | null
  onResume?: () => void
}

const SelectQuizz = ({
  quizzList,
  onSelect,
  onManage,
  onMedia,
  onTheme,
  resumeGameId,
  onResume,
}: Props) => {
  const [selected, setSelected] = useState<string | null>(null)

  const handleSelect = (id: string) => () => {
    if (selected === id) {
      setSelected(null)
    } else {
      setSelected(id)
    }
  }

  const handleSubmit = () => {
    if (!selected) {
      toast.error("Please select a quizz")

      return
    }

    onSelect(selected)
  }

  return (
    <div className="z-10 flex w-full max-w-md flex-col gap-4 rounded-md bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Select a quizz</h1>
        <div className="flex items-center gap-2">
          {resumeGameId && onResume && (
            <button
              className="rounded-md bg-amber-500 px-3 py-1 text-sm font-semibold text-white shadow"
              onClick={onResume}
            >
              Resume game
            </button>
          )}
          {onMedia && (
            <button
              className="text-sm font-semibold text-gray-700 underline"
              onClick={onMedia}
            >
              Media
            </button>
          )}
          {onTheme && (
            <button
              className="text-sm font-semibold text-amber-700 underline"
              onClick={onTheme}
            >
              Theme
            </button>
          )}
          {onManage && (
            <button
              className="text-sm font-semibold text-primary underline"
              onClick={onManage}
            >
              Manage
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center justify-center">
        <div className="w-full space-y-2">
          {quizzList.map((quizz) => (
            <button
              key={quizz.id}
              className={clsx(
                "flex w-full items-center justify-between rounded-md p-3 outline outline-gray-300",
              )}
              onClick={handleSelect(quizz.id)}
            >
              {quizz.subject}

              <div
                className={clsx(
                  "h-5 w-5 rounded outline outline-offset-3 outline-gray-300",
                  selected === quizz.id &&
                    "bg-primary border-primary/80 shadow-inset",
                )}
              ></div>
            </button>
          ))}
        </div>
      </div>
      <Button onClick={handleSubmit}>Submit</Button>
    </div>
  )
}

export default SelectQuizz
