import { useMemo } from 'react'
import { Question } from '../types'

interface Props {
  questions: Question[]
  onClose: () => void
}

const isAllAboveText = (text: string) => text.includes('以上皆是')

export default function AllAboveView({ questions, onClose }: Props) {
  const allAboveQuestions = useMemo(() =>
    questions.filter((q) => Object.values(q.options).some(isAllAboveText)),
    [questions]
  )
  const canMemorize = useMemo(() =>
    allAboveQuestions.filter((q) => isAllAboveText(q.options[q.answer])),
    [allAboveQuestions]
  )
  const isTrap = useMemo(() =>
    allAboveQuestions.filter((q) => !isAllAboveText(q.options[q.answer])),
    [allAboveQuestions]
  )

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">「以上皆是」答題策略分析</h2>
          <p className="text-sm text-gray-500 mt-1">
            哪些題可直接選「以上皆是」，哪些是陷阱
          </p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-medium">
          ✕ 關閉
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-gray-700">{allAboveQuestions.length}</div>
          <div className="text-sm text-gray-500 mt-1">含「以上皆是」題目</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{canMemorize.length}</div>
          <div className="text-sm text-green-700 mt-1">可直接背（答案是以上皆是）</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{isTrap.length}</div>
          <div className="text-sm text-red-700 mt-1">需看選項（以上皆是是陷阱）</div>
        </div>
      </div>

      {/* Section 1: Can memorize */}
      <section className="mb-10">
        <h3 className="text-lg font-bold text-green-700 mb-1">
          ✅ 可直接背（{canMemorize.length} 題）
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          這些題的正確答案就是「以上皆是」，看到題目直接選最後一個選項即可。
        </p>
        <div className="space-y-4">
          {canMemorize.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      </section>

      {/* Section 2: Traps */}
      <section className="mb-8">
        <h3 className="text-lg font-bold text-red-700 mb-1">
          ⚠️ 需要看選項（{isTrap.length} 題）
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          這些題雖然有「以上皆是」選項，但正確答案是其他選項，不可貿然選以上皆是。
        </p>
        <div className="space-y-4">
          {isTrap.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      </section>

      {/* Bottom close button */}
      <div className="text-center pt-4 border-t">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
        >
          返回設定
        </button>
      </div>
    </div>
  )
}

function QuestionCard({ question: q }: { question: Question }) {
  const optionKeys = ['A', 'B', 'C', 'D'] as const

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <p className="text-sm font-medium text-gray-800 mb-3">
        <span className="text-gray-400 mr-1">#{q.id}</span>
        {q.question}
      </p>
      <div className="space-y-1">
        {optionKeys.map((key) => {
          const text = q.options[key]
          const isCorrect = q.answer === key
          const hasAllAbove = isAllAboveText(text)

          return (
            <div
              key={key}
              className={`flex items-start gap-2 text-sm px-3 py-1.5 rounded ${
                isCorrect ? 'bg-green-100 text-green-900 font-medium' : 'text-gray-600'
              }`}
            >
              <span className="font-bold shrink-0 w-4">{key}.</span>
              <span className="flex-1">{text}</span>
              {hasAllAbove && !isCorrect && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shrink-0">
                  以上皆是
                </span>
              )}
              {isCorrect && (
                <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded shrink-0">
                  ✓
                </span>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 mt-2">正確答案：{q.answer}</p>
    </div>
  )
}
