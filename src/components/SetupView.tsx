import { useState } from 'react'
import { Question, QuizSettings } from '../types'
import {
  Play, BookOpen, Zap, Crosshair, Sparkles, HelpCircle,
  Cpu, ChevronRight,
} from 'lucide-react'

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

export default function SetupView({
  questions, onStart, onReadingMode, onWhitelist, onAllAbove, onStudyMode,
  onAdvisor, onSimulator, currentBankId, chapterNote, sourceUpdated,
}: Props) {
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
    const chaptersToUse = selectedChapters.length > 0 ? selectedChapters : chapters
    const filtered = questions.filter((q) => chaptersToUse.includes(q.chapter))
    if (filtered.length === 0) { setStartError('所選章節沒有題目，請重新選擇！'); return }
    setStartError(null)
    onStart({ chapters: chaptersToUse, count, instantFeedback, timeLimit })
  }

  function handleReadingMode() {
    const chaptersToUse = selectedChapters.length > 0 ? selectedChapters : chapters
    onReadingMode(chaptersToUse)
  }

  const featurePills = [
    { label: '完全免費', cls: 'badge-success' },
    { label: '無需登入', cls: 'badge-brand' },
    { label: 'AI 諧音記憶', cls: 'badge-neutral' },
    { label: '術科 3D 模擬器', cls: 'badge-teal' },
    { label: '即時更新', cls: 'badge-warn' },
  ] as const

  return (
    <div className="page-card">
      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {featurePills.map(({ label, cls }) => (
          <span key={label} className={cls}>{label}</span>
        ))}
      </div>

      {/* Section heading */}
      <div className="section-header">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">練習設定</h2>
          {sourceUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">題庫版本：{sourceUpdated}</p>
          )}
        </div>
        <span className="badge-neutral shrink-0">{questions.length} 題</span>
      </div>

      {/* 章節選擇 */}
      <fieldset className="mb-6">
        <legend className="text-sm font-semibold text-gray-700 mb-3">
          選擇章節
          <span className="text-gray-400 font-normal ml-1">（可多選，不選則全選）</span>
        </legend>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {chapters.map((chapter) => (
            <label
              key={chapter}
              className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                selectedChapters.includes(chapter)
                  ? 'border-brand bg-brand-subtle'
                  : 'border-border hover:border-brand-muted hover:bg-brand-subtle/40'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedChapters.includes(chapter)}
                onChange={() => toggleChapter(chapter)}
                className="w-4 h-4 text-brand border-border rounded focus:ring-brand accent-brand"
              />
              <span className="text-sm text-gray-700 leading-tight">{chapter}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {chapterNote && (
        <div className="mb-6 flex gap-3 px-4 py-3 bg-warn-subtle border border-warn-muted text-warn-dark text-sm rounded-lg">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>{chapterNote}</span>
        </div>
      )}

      {/* 題數 + 時間 (2 columns on md+) */}
      <div className="mb-6 grid md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="question-count" className="block text-sm font-semibold text-gray-700 mb-1.5">
            練習題數
          </label>
          <select
            id="question-count"
            value={count === 'all' ? 'all' : String(count)}
            onChange={(e) => setCount(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="select"
          >
            <option value="5">5 題</option>
            <option value="10">10 題</option>
            <option value="20">20 題</option>
            <option value="50">50 題</option>
            <option value="all">全部題目</option>
          </select>
        </div>

        <div>
          <label htmlFor="time-limit" className="block text-sm font-semibold text-gray-700 mb-1.5">
            每題作答時間
          </label>
          <select
            id="time-limit"
            value={String(timeLimit)}
            onChange={(e) => setTimeLimit(parseInt(e.target.value))}
            className="select"
          >
            <option value="5">5 秒</option>
            <option value="10">10 秒（預設）</option>
            <option value="15">15 秒</option>
            <option value="20">20 秒</option>
            <option value="30">30 秒</option>
            <option value="60">60 秒</option>
          </select>
        </div>
      </div>

      {/* 即時反饋 */}
      <label className="flex items-start gap-3 mb-8 cursor-pointer group">
        <input
          type="checkbox"
          id="instant-feedback"
          checked={instantFeedback}
          onChange={(e) => setInstantFeedback(e.target.checked)}
          className="w-5 h-5 mt-0.5 text-brand border-border rounded focus:ring-brand accent-brand shrink-0"
        />
        <span className="text-sm text-gray-700 leading-relaxed">
          作答後立即顯示正解
          <span className="text-gray-400">（若取消則直接跳下一題）</span>
        </span>
      </label>

      {startError && (
        <div role="alert" className="mb-4 px-4 py-3 bg-danger-subtle border border-danger-muted text-danger text-sm rounded-lg">
          {startError}
        </div>
      )}

      {/* Primary CTAs */}
      <div className="flex gap-3">
        <button onClick={handleStart} className="btn-primary btn-lg flex-1">
          <Play size={16} />
          開始練習
        </button>
        <button onClick={handleReadingMode} className="btn-outline btn-lg flex-1">
          <BookOpen size={16} />
          閱讀模式
        </button>
      </div>

      {/* Secondary action rows */}
      <div className="mt-4 flex flex-col gap-1">
        <button
          onClick={onWhitelist}
          className="action-row text-brand hover:bg-brand-subtle"
        >
          <Zap size={15} className="shrink-0 text-brand" />
          查看「無腦背答案」白名單清單
        </button>
        <button
          onClick={onAllAbove}
          className="action-row text-warn-dark hover:bg-warn-subtle"
        >
          <Crosshair size={15} className="shrink-0 text-warn" />
          查看「以上皆是」答題策略分析
        </button>
        {currentBankId === 'professional' && (
          <button
            onClick={onStudyMode}
            className="action-row text-purple-700 hover:bg-purple-50"
          >
            <Sparkles size={15} className="shrink-0 text-purple-500" />
            AI 學習模式（諧音 + 解析）
          </button>
        )}
        <button
          onClick={onAdvisor}
          className="action-row text-gray-400 hover:text-brand hover:bg-brand-subtle text-xs"
        >
          <HelpCircle size={13} className="shrink-0" />
          不確定要考哪種證？重新診斷
        </button>
      </div>

      {/* Simulator card */}
      <div className="mt-6 rounded-xl border border-teal-muted bg-teal-subtle p-4">
        <div className="flex items-start gap-3 mb-3">
          <Cpu size={22} className="text-teal shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-teal-dark text-sm">術科測驗 3D 飛行模擬器（多旋翼機）</p>
            <p className="text-xs text-teal-dark/80 mt-0.5 leading-relaxed">
              瀏覽器內模擬真實考場場地，支援 RTH 自動返航、ATTI／POS 模式切換、風場干擾，桌面鍵盤與手機觸控搖桿均可操作。
            </p>
          </div>
        </div>
        <button onClick={onSimulator} className="btn-teal btn-md w-full">
          進入模擬器
          <ChevronRight size={15} />
        </button>
      </div>

      {/* FAQ accordion */}
      <details className="mt-6 group">
        <summary className="cursor-pointer text-sm font-semibold text-gray-500 hover:text-gray-700 list-none flex items-center gap-1 select-none">
          <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
          常見問題
        </summary>
        <dl className="mt-3 space-y-4 text-sm text-gray-700">
          <div>
            <dt className="font-semibold">普通操作證和專業操作證有什麼差別？</dt>
            <dd className="mt-1 text-gray-500 leading-relaxed">普通操作證適用於休閒娛樂飛行；專業操作證用於商業用途（空拍、農業噴灑、測量等），題庫範圍較廣。兩套題庫均可在本網站免費練習。</dd>
          </div>
          <div>
            <dt className="font-semibold">無人機操作證筆試考幾題？幾分及格？</dt>
            <dd className="mt-1 text-gray-500 leading-relaxed">依民航局規定，學科（筆試）每科 20 題單選，滿分 100 分，60 分及格。</dd>
          </div>
          <div>
            <dt className="font-semibold">這個網站免費嗎？需要登入嗎？</dt>
            <dd className="mt-1 text-gray-500 leading-relaxed">完全免費，無需註冊帳號。四套完整題庫與術科模擬器均可直接使用，題庫跟隨民航局最新公告自動更新。</dd>
          </div>
          <div>
            <dt className="font-semibold">無人機術科測驗要考什麼？如何準備？</dt>
            <dd className="mt-1 text-gray-500 leading-relaxed">術科測驗重點是實際飛行操控，例如起降、懸停與定點繞行。本站的多旋翼機 3D 模擬器支援 RTH、ATTI/POS、風場、搖桿輸入可視化、姿態 HUD 與降落安全提示，可用來熟悉操作手感。</dd>
          </div>
        </dl>
      </details>
    </div>
  )
}
