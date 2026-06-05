import { useMemo } from 'react'
import { Question } from '../types'
import { X, CheckCircle2, AlertTriangle, Check } from 'lucide-react'

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
    <div className="page-card">
      <div className="section-header">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">「以上皆是」答題策略分析</h2>
          <p className="text-sm text-gray-500 mt-0.5">哪些題可直接選「以上皆是」，哪些是陷阱</p>
        </div>
        <button onClick={onClose} className="btn-close">
          <X size={16} />
          關閉
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-surface rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-gray-700">{allAboveQuestions.length}</div>
          <div className="text-xs text-gray-500 mt-1">含「以上皆是」</div>
        </div>
        <div className="bg-success-subtle rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-success">{canMemorize.length}</div>
          <div className="text-xs text-success-dark mt-1">可直接背</div>
        </div>
        <div className="bg-danger-subtle rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-danger">{isTrap.length}</div>
          <div className="text-xs text-danger-dark mt-1">需看選項</div>
        </div>
      </div>

      {/* Section 1: Can memorize */}
      <section className="mb-10">
        <h3 className="flex items-center gap-2 text-base font-semibold text-success mb-1">
          <CheckCircle2 size={18} />
          可直接背（{canMemorize.length} 題）
        </h3>
        <p className="text-xs text-gray-400 mb-4">這些題的正確答案就是「以上皆是」，看到題目直接選最後一個選項即可。</p>
        <div className="space-y-3">
          {canMemorize.map((q) => (
            <QuestionCard key={`${q.id}-${q.chapter}`} question={q} />
          ))}
        </div>
      </section>

      {/* Section 2: Traps */}
      <section className="mb-8">
        <h3 className="flex items-center gap-2 text-base font-semibold text-danger mb-1">
          <AlertTriangle size={18} />
          需要看選項（{isTrap.length} 題）
        </h3>
        <p className="text-xs text-gray-400 mb-4">這些題雖然有「以上皆是」選項，但正確答案是其他選項，不可貿然選以上皆是。</p>
        <div className="space-y-3">
          {isTrap.map((q) => (
            <QuestionCard key={`${q.id}-${q.chapter}`} question={q} />
          ))}
        </div>
      </section>

      <div className="text-center pt-4 border-t border-border">
        <button onClick={onClose} className="btn-ghost btn-md">
          返回設定
        </button>
      </div>
    </div>
  )
}

function QuestionCard({ question: q }: { question: Question }) {
  const optionKeys = ['A', 'B', 'C', 'D'] as const

  return (
    <div className="border border-border rounded-xl p-4 bg-white">
      <p className="text-sm text-gray-800 mb-3 leading-relaxed">
        <span className="text-gray-400 text-xs mr-1.5">#{q.id}</span>
        {q.question}
      </p>
      <div className="space-y-1">
        {optionKeys.map((key) => {
          const text = q.options[key]
          if (!text) return null
          const isCorrect = q.answer === key
          const hasAllAbove = isAllAboveText(text)

          return (
            <div
              key={key}
              className={`flex items-start gap-2 text-sm px-3 py-1.5 rounded-lg ${
                isCorrect
                  ? 'bg-success-muted text-success-dark font-medium'
                  : 'text-gray-500'
              }`}
            >
              <span className="font-bold shrink-0 w-4 text-xs mt-0.5">{key}.</span>
              <span className="flex-1 leading-relaxed">{text}</span>
              {hasAllAbove && !isCorrect && (
                <span className="badge-warn shrink-0">陷阱</span>
              )}
              {isCorrect && (
                <span className="inline-flex items-center justify-center w-5 h-5 bg-success rounded-full shrink-0">
                  <Check size={11} className="text-white" />
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
