import { UserRecord, OptionKey } from '../types'

interface Props {
  records: UserRecord[]
  onRestart: () => void
  onRetryWrong: () => void
}

export default function ResultView({ records, onRestart, onRetryWrong }: Props) {
  const total = records.length
  const correctCount = records.filter((r) => r.isCorrect).length
  const wrongCount = total - correctCount
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0

  const isPassing = accuracy >= 60
  const totalSeconds = records.reduce((sum, r) => sum + r.timeSpent, 0)
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')

  const wrongRecords = records.filter((r) => !r.isCorrect)
  const scoreCircumference = 2 * Math.PI * 50

  function getOptionText(record: UserRecord, key: OptionKey | null): string {
    if (!key) return '未作答 (逾時)'
    const text = record.options[key] ?? ''
    return `${key}. ${text}`
  }

  return (
    <div className="page-card">
      <h2 className="text-2xl font-bold text-center mb-6">練習結果報告</h2>

      {/* 分數圓盤 */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <svg viewBox="0 0 120 120" className="w-36 h-36">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="10"/>
            <circle
              cx="60" cy="60" r="50" fill="none"
              stroke={isPassing ? '#22c55e' : '#ef4444'}
              strokeWidth="10"
              strokeDasharray={scoreCircumference}
              strokeDashoffset={scoreCircumference * (1 - accuracy / 100)}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${isPassing ? 'text-green-600' : 'text-red-600'}`}>{accuracy}%</span>
            <span className={`text-xs font-semibold mt-0.5 ${isPassing ? 'text-green-500' : 'text-red-400'}`}>
              {isPassing ? '及格' : '未及格'}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">及格標準：60 分</p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-3 gap-3 mb-6 text-center">
        <div className="p-3 bg-brand-subtle rounded-lg">
          <div className="text-xs text-gray-500 mb-1">總題數</div>
          <div className="text-2xl font-bold text-brand">{total}</div>
        </div>
        <div className="p-3 bg-success-subtle rounded-lg">
          <div className="text-xs text-gray-500 mb-1">答對</div>
          <div className="text-2xl font-bold text-success">{correctCount}</div>
        </div>
        <div className="p-3 bg-danger-subtle rounded-lg">
          <div className="text-xs text-gray-500 mb-1">錯誤/未答</div>
          <div className="text-2xl font-bold text-danger">{wrongCount}</div>
        </div>
      </div>

      <div className="text-center mb-8 text-gray-500 text-sm">
        總耗時：<span className="font-mono font-bold text-gray-700">{minutes}:{seconds}</span>
      </div>

      {/* 錯題回顧 */}
      <div className="mb-8">
        <h3 className="text-base font-semibold mb-4 border-l-4 border-danger pl-3">錯題回顧</h3>
        {wrongRecords.length === 0 ? (
          <div className="text-center text-success py-4 bg-success-subtle rounded-lg text-sm font-medium">
            太棒了！這次練習沒有錯題 🎉
          </div>
        ) : (
          <div className="space-y-4">
            {wrongRecords.map((record) => (
              <div
                key={`${record.questionId}-${record.userAnswer}`}
                className="bg-white border border-border rounded-xl p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="badge-danger">錯題</span>
                  <span className="badge-neutral">{record.chapter}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-3 leading-relaxed">{record.question}</p>
                <div className="text-sm space-y-1.5 border-t border-border pt-3">
                  <div className="flex gap-2">
                    <span className="text-gray-400 shrink-0 w-16">您的答案</span>
                    <span className="text-danger font-medium">{getOptionText(record, record.userAnswer)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400 shrink-0 w-16">正確答案</span>
                    <span className="text-success font-medium">{getOptionText(record, record.correctAnswer)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {wrongRecords.length > 0 && (
          <button onClick={onRetryWrong} className="btn-warn btn-lg w-full">
            再練一次錯題（{wrongRecords.length} 題）
          </button>
        )}
        <button onClick={onRestart} className="btn-primary btn-lg w-full">
          回到章節選擇
        </button>
      </div>
    </div>
  )
}
