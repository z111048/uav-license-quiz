import { useEffect, useRef, useState, useCallback } from 'react'
import { Question, QuizSettings, UserRecord, ImageMap, OptionKey } from '../types'

interface Props {
  queue: Question[]
  allQuestions?: Question[]
  settings: QuizSettings
  imageMap?: ImageMap | null
  onFinish: (records: UserRecord[]) => void
}

type OptionState = 'default' | 'correct' | 'wrong' | 'faded'

export default function QuizView({ queue, allQuestions, settings, imageMap, onFinish }: Props) {
  const timeLimit = settings.timeLimit
  const [index, setIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [answered, setAnswered] = useState(false)
  const [nextReady, setNextReady] = useState(false)
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  const records = useRef<UserRecord[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeSpentRef = useRef(0)
  const nextButtonRef = useRef<HTMLButtonElement>(null)

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
    setTimeLeft(timeLimit)
    setAnswered(false)
    setNextReady(false)
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

  // Scroll next button into view after answering so it's never hidden below fold
  useEffect(() => {
    if (answered && settings.instantFeedback) {
      // Delay slightly to let the DOM insert the button before scrolling
      const scrollId = setTimeout(() => {
        nextButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 80)
      // Wait for ghost-click prevention window (~300ms) before accepting taps on the button
      const readyId = setTimeout(() => setNextReady(true), 350)
      return () => {
        clearTimeout(scrollId)
        clearTimeout(readyId)
      }
    }
  }, [answered, settings.instantFeedback])

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
        timeSpent: timeLimit,
      })
    }
  }, [timeLeft, answered, currentQ, clearTimer])

  function handleAnswer(key: OptionKey) {
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

  function getOptionState(key: OptionKey): OptionState {
    if (!answered) return 'default'
    if (key === currentQ.answer) return 'correct'
    if (key === selectedKey) return 'wrong'
    return 'faded'
  }

  const optionStateClasses: Record<OptionState, string> = {
    default:  'border-border bg-white hover:border-brand-muted hover:bg-brand-subtle cursor-pointer',
    correct:  'border-success bg-success-muted text-success-dark',
    wrong:    'border-danger  bg-danger-muted  text-danger-dark',
    faded:    'border-border  bg-white opacity-40',
  }

  const badgeStateClasses: Record<OptionState, string> = {
    default: 'bg-surface text-gray-600',
    correct: 'bg-success-muted text-success-dark',
    wrong:   'bg-danger-muted  text-danger-dark',
    faded:   'bg-surface text-gray-400',
  }

  const timerCircumference = 2 * Math.PI * 16

  return (
    <div className="page-card relative">
      {/* 進度條 */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((index + 1) / queue.length) * 100}%` }}
        />
      </div>

      {/* 頂部資訊欄 */}
      <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">題目</p>
          <p className="font-bold text-gray-800 leading-none">
            <span className="text-blue-600 text-2xl">{index + 1}</span>
            <span className="text-gray-400 text-sm"> / {queue.length}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-gray-500 bg-gray-100 px-3 py-1 rounded-full text-xs whitespace-nowrap shrink-0 hidden sm:block">
            {currentQ.chapter}
          </div>
          {/* 圓形倒數計時器 */}
          <div aria-label={`剩餘時間 ${timeLeft} 秒`} aria-live="off" className="relative flex-shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#f3f4f6" strokeWidth="3.5"/>
              <circle
                cx="20" cy="20" r="16" fill="none"
                stroke={timeLeft <= 5 ? '#ef4444' : '#3b82f6'}
                strokeWidth="3.5"
                strokeDasharray={timerCircumference}
                strokeDashoffset={timerCircumference * (1 - timeLeft / timeLimit)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold font-mono ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
              {timeLeft}
            </span>
          </div>
        </div>
      </div>

      {/* 題目 */}
      <div className="mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed">
          {currentQ.question}
        </h3>
        {(() => {
          const globalIdx = allQuestions ? allQuestions.indexOf(currentQ) : -1
          const imgUrl = globalIdx >= 0 ? imageMap?.[String(globalIdx)] : undefined
          return imgUrl ? (
            <div className="mt-4">
              <div className="aspect-square w-full rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={imgUrl}
                  alt="題目示意圖"
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
              <p className="text-xs text-gray-400 text-center mt-1">圖片由 AI 產製，僅供參考，可能與實際情況有所差異</p>
            </div>
          ) : null
        })()}
      </div>

      {/* 答案提示 */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowHint((h) => !h)}
          className="text-xs text-brand hover:text-brand-dark underline"
        >
          顯示/隱藏答案提示
        </button>
      </div>
      {showHint && (
        <div className="mb-4 p-3 bg-warn-subtle text-warn-dark rounded-lg border border-warn-muted text-sm">
          提示：正確答案是{' '}
          <span className="font-bold">{currentQ.options[currentQ.answer]}</span>
        </div>
      )}

      {/* 選項 */}
      <div className={`space-y-3 no-select ${answered ? 'pointer-events-none' : ''}`}>
        {timedOut && (
          <div className="text-center text-red-500 font-bold mb-2">時間到！</div>
        )}
        {(Object.entries(currentQ.options) as [OptionKey, string][]).map(([key, value]) => {
          const state = getOptionState(key)
          return (
            <button
              type="button"
              key={key}
              onClick={() => handleAnswer(key)}
              className={`option-btn w-full p-4 rounded-lg border-2 flex items-center transition touch-manipulation ${optionStateClasses[state]}`}
            >
              <span
                className={`font-bold w-8 h-8 flex items-center justify-center rounded-full mr-4 ${badgeStateClasses[state]}`}
              >
                {key}
              </span>
              <span className="text-lg text-gray-800">{value}</span>
            </button>
          )
        })}
      </div>

      {/* 下一題按鈕 */}
      {answered && settings.instantFeedback && (
        <div className="mt-6 pt-5 border-t border-border">
          <button
            ref={nextButtonRef}
            onClick={advance}
            className={`btn-dark btn-lg w-full touch-manipulation ${!nextReady ? 'pointer-events-none' : ''}`}
          >
            下一題
          </button>
        </div>
      )}
    </div>
  )
}
