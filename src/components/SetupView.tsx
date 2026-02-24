import { useState } from 'react'
import { Question, QuizSettings } from '../types'

interface Props {
  questions: Question[]
  whitelist: string[]
  currentBankId: string
  onStart: (settings: QuizSettings) => void
  onReadingMode: (chapters: string[]) => void
  onWhitelist: () => void
  onAllAbove: () => void
  onStudyMode: () => void
}

export default function SetupView({ questions, onStart, onReadingMode, onWhitelist, onAllAbove, onStudyMode, currentBankId }: Props) {
  const chapters = [...new Set(questions.map((q) => q.chapter))]
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [count, setCount] = useState<number | 'all'>(50)
  const [instantFeedback, setInstantFeedback] = useState(true)

  function toggleChapter(chapter: string) {
    setSelectedChapters((prev) =>
      prev.includes(chapter) ? prev.filter((c) => c !== chapter) : [...prev, chapter]
    )
  }

  function handleStart() {
    if (selectedChapters.length === 0 && questions.length === 0) {
      return
    }
    const chaptersToUse = selectedChapters.length > 0 ? selectedChapters : chapters
    let filtered = questions.filter((q) => chaptersToUse.includes(q.chapter))

    if (filtered.length === 0) {
      alert('所選章節沒有題目，請重新選擇！')
      return
    }

    onStart({ chapters: chaptersToUse, count, instantFeedback })
  }

  function handleReadingMode() {
    const chaptersToUse = selectedChapters.length > 0 ? selectedChapters : chapters
    onReadingMode(chaptersToUse)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <h2 className="text-xl font-semibold mb-4 border-b pb-2">練習設定</h2>

      {/* 章節選擇 */}
      <div className="mb-6">
        <label className="block text-gray-700 font-bold mb-2">選擇章節 (可多選，不選則全選)</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {chapters.map((chapter) => (
            <div key={chapter} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`ch-${chapter}`}
                checked={selectedChapters.includes(chapter)}
                onChange={() => toggleChapter(chapter)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor={`ch-${chapter}`}
                className="text-sm text-gray-700 cursor-pointer"
              >
                {chapter}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 題數設定 */}
      <div className="mb-6">
        <label className="block text-gray-700 font-bold mb-2">練習題數</label>
        <select
          value={count === 'all' ? 'all' : String(count)}
          onChange={(e) => setCount(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className="w-full p-2 border rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="5">5 題</option>
          <option value="10">10 題</option>
          <option value="20">20 題</option>
          <option value="50">50 題</option>
          <option value="all">全部題目</option>
        </select>
      </div>

      {/* 即時反饋 */}
      <div className="mb-8 flex items-center">
        <input
          type="checkbox"
          id="instant-feedback"
          checked={instantFeedback}
          onChange={(e) => setInstantFeedback(e.target.checked)}
          className="w-5 h-5 text-blue-600"
        />
        <label htmlFor="instant-feedback" className="ml-2 text-gray-700">
          作答後立即顯示正解 (若取消則直接跳下一題)
        </label>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleStart}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition duration-200"
        >
          開始練習
        </button>
        <button
          onClick={handleReadingMode}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow transition duration-200"
        >
          閱讀模式
        </button>
      </div>

      <div className="mt-4 text-center space-y-2">
        <div>
          <button
            onClick={onWhitelist}
            className="text-indigo-600 hover:text-indigo-800 underline text-sm"
          >
            查看「無腦背答案」白名單清單
          </button>
        </div>
        <div>
          <button
            onClick={onAllAbove}
            className="text-amber-600 hover:text-amber-800 underline text-sm"
          >
            查看「以上皆是」答題策略分析
          </button>
        </div>
        {currentBankId === 'professional' && (
          <div>
            <button
              onClick={onStudyMode}
              className="text-purple-600 hover:text-purple-800 underline text-sm"
            >
              AI 學習模式（諧音 + 解析）
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
