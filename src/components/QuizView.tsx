import { useEffect, useRef, useState, useCallback } from 'react'
import { Question, QuizSettings, UserRecord } from '../types'

const TIME_LIMIT = 10

interface Props {
  queue: Question[]
  settings: QuizSettings
  onFinish: (records: UserRecord[]) => void
}

type OptionState = 'default' | 'correct' | 'wrong' | 'faded'

export default function QuizView({ queue, settings, onFinish }: Props) {
  const [index, setIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [answered, setAnswered] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  const records = useRef<UserRecord[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeSpentRef = useRef(0)

  const currentQ = queue[index]

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const advance = useCallback(() => {
    if (index < queue.length - 1) {
      setIndex((i) => i + 1)
    } else {
      onFinish(records.current)
    }
  }, [index, queue.length, onFinish])

  // Reset state on question change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    setTimeLeft(TIME_LIMIT)
    setAnswered(false)
    setSelectedKey(null)
    setShowHint(false)
    setTimedOut(false)
    timeSpentRef.current = 0

    clearTimer()
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          return 0
        }
        return t - 1
      })
      timeSpentRef.current += 1
    }, 1000)

    return () => clearTimer()
  }, [index, clearTimer])

  // Handle timeout
  useEffect(() => {
    if (timeLeft === 0 && !answered) {
      clearTimer()
      setTimedOut(true)
      setAnswered(true)
      records.current.push({
        questionId: currentQ.id,
        question: currentQ.question,
        chapter: currentQ.chapter,
        options: currentQ.options,
        correctAnswer: currentQ.answer,
        userAnswer: null,
        isCorrect: false,
        timeSpent: TIME_LIMIT,
      })
    }
  }, [timeLeft, answered, currentQ, clearTimer])

  function handleAnswer(key: string) {
    if (answered) return
    clearTimer()
    const isCorrect = key === currentQ.answer

    records.current.push({
      questionId: currentQ.id,
      question: currentQ.question,
      chapter: currentQ.chapter,
      options: currentQ.options,
      correctAnswer: currentQ.answer,
      userAnswer: key,
      isCorrect,
      timeSpent: timeSpentRef.current,
    })

    setSelectedKey(key)
    setAnswered(true)

    if (!settings.instantFeedback) {
      setTimeout(advance, 500)
    }
  }

  function getOptionState(key: string): OptionState {
    if (!answered) return 'default'
    if (key === currentQ.answer) return 'correct'
    if (key === selectedKey) return 'wrong'
    return 'faded'
  }

  const optionStateClasses: Record<OptionState, string> = {
    default:
      'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer',
    correct: 'border-green-500 bg-green-100 text-green-800',
    wrong: 'border-red-500 bg-red-100 text-red-800',
    faded: 'border-gray-200 bg-white opacity-50',
  }

  const badgeStateClasses: Record<OptionState, string> = {
    default: 'bg-gray-200 text-gray-700',
    correct: 'bg-green-200',
    wrong: 'bg-red-200',
    faded: 'bg-gray-200',
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 relative">
      {/* 頂部資訊欄 */}
      <div className="flex justify-between items-center mb-6 text-sm md:text-base border-b pb-4">
        <div className="font-bold text-gray-600">
          題號：
          <span className="text-blue-600 text-xl">{index + 1}</span>
          {' '}/ {queue.length}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-gray-500 bg-gray-100 px-3 py-1 rounded-full text-xs whitespace-nowrap shrink-0">
            {currentQ.chapter}
          </div>
          <div
            className={`flex items-center font-mono font-bold text-xl ${
              timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-red-500'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="inline-block w-8 text-right">{timeLeft}</span>s
          </div>
        </div>
      </div>

      {/* 題目 */}
      <div className="mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed">
          {currentQ.question}
        </h3>
      </div>

      {/* 答案提示 */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowHint((h) => !h)}
          className="text-xs text-blue-500 hover:text-blue-700 underline"
        >
          顯示/隱藏答案提示
        </button>
      </div>
      {showHint && (
        <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded border border-yellow-200 text-sm">
          提示：正確答案是{' '}
          <span className="font-bold">{currentQ.options[currentQ.answer as 'A' | 'B' | 'C' | 'D']}</span>
        </div>
      )}

      {/* 選項 */}
      <div className="space-y-3 no-select">
        {timedOut && (
          <div className="text-center text-red-500 font-bold mb-2">時間到！</div>
        )}
        {(Object.entries(currentQ.options) as [string, string][]).map(([key, value]) => {
          const state = getOptionState(key)
          return (
            <div
              key={key}
              onClick={() => handleAnswer(key)}
              className={`option-btn w-full p-4 rounded-lg border-2 flex items-center transition ${optionStateClasses[state]}`}
            >
              <span
                className={`font-bold w-8 h-8 flex items-center justify-center rounded-full mr-4 ${badgeStateClasses[state]}`}
              >
                {key}
              </span>
              <span className="text-lg text-gray-800">{value}</span>
            </div>
          )
        })}
      </div>

      {/* 下一題按鈕 */}
      {answered && settings.instantFeedback && (
        <div className="mt-6">
          <button
            onClick={advance}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-lg transition"
          >
            下一題
          </button>
        </div>
      )}
    </div>
  )
}
