import { useState } from 'react'
import { Question, QuizSettings } from '../types'

interface Props {
  questions: Question[]
  whitelist: string[]
  currentBankId: string
  chapterNote?: string
  sourceUpdated?: string
  onStart: (settings: QuizSettings) => void
  onReadingMode: (chapters: string[]) => void
  onWhitelist: () => void
  onAllAbove: () => void
  onStudyMode: () => void
  onAdvisor: () => void
  onSimulator: () => void
}

export default function SetupView({ questions, onStart, onReadingMode, onWhitelist, onAllAbove, onStudyMode, onAdvisor, onSimulator, currentBankId, chapterNote, sourceUpdated }: Props) {
  const chapters = [...new Set(questions.map((q) => q.chapter))]
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [count, setCount] = useState<number | 'all'>(50)
  const [instantFeedback, setInstantFeedback] = useState(true)
  const [timeLimit, setTimeLimit] = useState(10)
  const [startError, setStartError] = useState<string | null>(null)

  function toggleChapter(chapter: string) {
    setStartError(null)
    setSelectedChapters((prev) =>
      prev.includes(chapter) ? prev.filter((c) => c !== chapter) : [...prev, chapter]
    )
  }

  function handleStart() {
    if (selectedChapters.length === 0 && questions.length === 0) {
      return
    }
    const chaptersToUse = selectedChapters.length > 0 ? selectedChapters : chapters
    const filtered = questions.filter((q) => chaptersToUse.includes(q.chapter))

    if (filtered.length === 0) {
      setStartError('所選章節沒有題目，請重新選擇！')
      return
    }

    setStartError(null)
    onStart({ chapters: chaptersToUse, count, instantFeedback, timeLimit })
  }

  function handleReadingMode() {
    const chaptersToUse = selectedChapters.length > 0 ? selectedChapters : chapters
    onReadingMode(chaptersToUse)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {['完全免費', '無需登入', 'AI 諧音記憶', '術科 3D 模擬器', '即時更新'].map((label) => (
          <span key={label} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
            {label}
          </span>
        ))}
      </div>

      <div className="flex items-baseline justify-between border-b pb-2 mb-4">
        <h2 className="text-xl font-semibold">練習設定</h2>
        <span className="text-xs text-gray-400">
          共 {questions.length} 題
          {sourceUpdated && <>　題庫版本：{sourceUpdated}</>}
        </span>
      </div>

      {/* 章節選擇 */}
      <fieldset className="mb-6">
        <legend className="block text-gray-700 font-bold mb-2">選擇章節 (可多選，不選則全選)</legend>
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
      </fieldset>

      {chapterNote && (
        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
          ⚠️ {chapterNote}
        </div>
      )}

      {/* 題數設定 */}
      <div className="mb-6">
        <label htmlFor="question-count" className="block text-gray-700 font-bold mb-2">練習題數</label>
        <select
          id="question-count"
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

      {/* 每題作答時間 */}
      <div className="mb-6">
        <label htmlFor="time-limit" className="block text-gray-700 font-bold mb-2">每題作答時間</label>
        <select
          id="time-limit"
          value={String(timeLimit)}
          onChange={(e) => setTimeLimit(parseInt(e.target.value))}
          className="w-full p-2 border rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="5">5 秒</option>
          <option value="10">10 秒（預設）</option>
          <option value="15">15 秒</option>
          <option value="20">20 秒</option>
          <option value="30">30 秒</option>
          <option value="60">60 秒</option>
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

      {startError && (
        <div role="alert" className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {startError}
        </div>
      )}

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
        <div>
          <button
            onClick={onAdvisor}
            className="text-gray-400 hover:text-blue-600 underline text-xs"
          >
            🪁 不確定要考哪種證？重新診斷
          </button>
        </div>
      </div>

      {/* Simulator card */}
      <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🚁</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-teal-800 text-sm">術科測驗 3D 飛行模擬器（多旋翼機）</p>
            <p className="text-xs text-teal-700 mt-0.5">瀏覽器內模擬真實考場場地，支援 RTH 自動返航、ATTI／POS 模式切換、風場干擾，桌面鍵盤與手機觸控搖桿均可操作。</p>
          </div>
        </div>
        <button
          onClick={onSimulator}
          className="mt-3 w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2 rounded-lg transition duration-200"
        >
          進入模擬器 →
        </button>
      </div>

      {/* Visible FAQ — matches FAQPage JSON-LD schema, also useful for users */}
      <details className="mt-6 group">
        <summary className="cursor-pointer text-sm font-semibold text-gray-500 hover:text-gray-700 list-none flex items-center gap-1">
          <span className="transition-transform group-open:rotate-90">▶</span> 常見問題
        </summary>
        <dl className="mt-3 space-y-4 text-sm text-gray-700">
          <div>
            <dt className="font-semibold">普通操作證和專業操作證有什麼差別？</dt>
            <dd className="mt-1 text-gray-600">普通操作證適用於休閒娛樂飛行；專業操作證用於商業用途（空拍、農業噴灑、測量等），題庫範圍較廣。兩套題庫均可在本網站免費練習。</dd>
          </div>
          <div>
            <dt className="font-semibold">無人機操作證筆試考幾題？幾分及格？</dt>
            <dd className="mt-1 text-gray-600">依民航局規定，學科（筆試）每科 20 題單選，滿分 100 分，60 分及格。</dd>
          </div>
          <div>
            <dt className="font-semibold">這個網站免費嗎？需要登入嗎？</dt>
            <dd className="mt-1 text-gray-600">完全免費，無需註冊帳號。四套完整題庫與術科模擬器均可直接使用，題庫跟隨民航局最新公告自動更新。</dd>
          </div>
        </dl>
      </details>
    </div>
  )
}
