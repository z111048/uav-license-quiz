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

  const totalSeconds = records.reduce((sum, r) => sum + r.timeSpent, 0)
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')

  const wrongRecords = records.filter((r) => !r.isCorrect)

  function getOptionText(record: UserRecord, key: OptionKey | null): string {
    if (!key) return '未作答 (逾時)'
    const text = record.options[key] ?? ''
    return `${key}. ${text}`
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <h2 className="text-2xl font-bold text-center mb-6">練習結果報告</h2>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-gray-500">總題數</div>
          <div className="text-2xl font-bold text-blue-600">{total}</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-sm text-gray-500">答對</div>
          <div className="text-2xl font-bold text-green-600">{correctCount}</div>
        </div>
        <div className="p-4 bg-red-50 rounded-lg">
          <div className="text-sm text-gray-500">錯誤/未答</div>
          <div className="text-2xl font-bold text-red-600">{wrongCount}</div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="text-sm text-gray-500">正確率</div>
          <div className="text-2xl font-bold text-purple-600">{accuracy}%</div>
        </div>
      </div>

      <div className="text-center mb-8 text-gray-600">
        總耗時：
        <span className="font-mono font-bold">
          {minutes}:{seconds}
        </span>
      </div>

      {/* 錯題回顧 */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4 border-l-4 border-red-500 pl-3">錯題回顧</h3>
        {wrongRecords.length === 0 ? (
          <div className="text-center text-green-600 py-4 bg-green-50 rounded">
            太棒了！這次練習沒有錯題 🎉
          </div>
        ) : (
          <div className="space-y-4">
            {wrongRecords.map((record) => (
              <div
                key={`${record.questionId}-${record.userAnswer}`}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-block bg-red-100 text-red-600 text-xs px-2 py-1 rounded font-bold">
                    錯題
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {record.chapter}
                  </span>
                </div>
                <p className="font-bold text-gray-800 mb-3">{record.question}</p>
                <div className="text-sm space-y-1">
                  <div className="flex">
                    <span className="w-20 text-gray-500">您的答案：</span>
                    <span className="text-red-600 font-medium">
                      {getOptionText(record, record.userAnswer)}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-20 text-gray-500">正確答案：</span>
                    <span className="text-green-600 font-medium">
                      {getOptionText(record, record.correctAnswer)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {wrongRecords.length > 0 && (
          <button
            onClick={onRetryWrong}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg shadow"
          >
            再練一次錯題（{wrongRecords.length} 題）
          </button>
        )}
        <button
          onClick={onRestart}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow"
        >
          回到章節選擇
        </button>
      </div>
    </div>
  )
}
