import { useState } from 'react'
import { Question, StudyAid, StudyAids, ImageMap } from '../types'

interface Props {
  questions: Question[]
  studyAids: StudyAids | null
  studyAidsLoading: boolean
  studyAidsError: string | null
  imageMap?: ImageMap | null
  onClose: () => void
}

function QuestionCard({
  question,
  aid,
  imageUrl,
}: {
  question: Question
  aid: StudyAid | null | undefined
  imageUrl?: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const hasAid = aid && Object.keys(aid).length > 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
          {question.chapter}
        </span>
        {question.can_memorize_directly && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">
            ⚡ 可無腦背
          </span>
        )}
        <span className="text-xs text-gray-400 ml-auto">#{question.id}</span>
      </div>

      {/* Question text */}
      <p className="text-sm text-gray-800 mb-3 leading-relaxed">{question.question}</p>

      {/* Image */}
      {imageUrl && (
        <div className="mb-3">
          <img
            src={imageUrl}
            alt="題目示意圖"
            className="max-w-[240px] rounded-lg border border-gray-200 object-contain bg-gray-50"
            loading="lazy"
          />
        </div>
      )}

      {/* Options */}
      <div className="space-y-1 mb-3">
        {(Object.entries(question.options) as [string, string][]).map(([key, value]) => (
          <div
            key={key}
            className={`text-sm px-3 py-1.5 rounded flex gap-2 ${
              key === question.answer
                ? 'bg-green-50 text-green-800 font-medium border border-green-200'
                : 'bg-gray-50 text-gray-600'
            }`}
          >
            <span className="font-bold shrink-0">{key}.</span>
            <span>{value}</span>
            {key === question.answer && <span className="ml-auto shrink-0">✓</span>}
          </div>
        ))}
      </div>

      {/* AI Aid toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-purple-600 hover:text-purple-800 underline"
      >
        {expanded ? '▲ 收起 AI 輔助' : '▼ 展開 AI 輔助'}
      </button>

      {expanded && (
        <div className="mt-3 border-t pt-3 space-y-2">
          {!hasAid ? (
            <p className="text-xs text-gray-400 italic">尚未產生 AI 學習輔助</p>
          ) : (
            <>
              {aid.keywords && (
                <div>
                  <span className="text-xs font-bold text-gray-500">🔑 關鍵字：</span>
                  <span className="text-xs text-gray-700">{aid.keywords}</span>
                </div>
              )}
              {aid.mnemonic && (
                <div>
                  <span className="text-xs font-bold text-gray-500">🎵 諧音口訣：</span>
                  <span className="text-xs text-gray-700">{aid.mnemonic}</span>
                </div>
              )}
              {aid.explanation && (
                <div>
                  <span className="text-xs font-bold text-gray-500">💡 概念解析：</span>
                  <span className="text-xs text-gray-700">{aid.explanation}</span>
                </div>
              )}
              {aid.wrong_options && Object.keys(aid.wrong_options).length > 0 && (
                <div>
                  <span className="text-xs font-bold text-gray-500">❌ 錯誤選項：</span>
                  <div className="mt-1 space-y-1">
                    {(Object.entries(aid.wrong_options) as [string, string][]).map(([k, v]) => (
                      <div key={k} className="text-xs text-gray-600 pl-2">
                        <span className="font-medium">{k}：</span>{v}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function StudyView({ questions, studyAids, studyAidsLoading, studyAidsError, imageMap, onClose }: Props) {
  const [selectedChapter, setSelectedChapter] = useState<string>('全部')
  const [search, setSearch] = useState('')

  const chapters = [...new Set(questions.map((q) => q.chapter))]

  // Chapter stats
  const chapterStats = chapters.map((ch) => {
    const qs = questions.filter((q) => q.chapter === ch)
    const memorizable = qs.filter((q) => q.can_memorize_directly).length
    return { chapter: ch, total: qs.length, memorizable }
  })

  // Filter questions
  const filtered = questions.filter((q) => {
    if (selectedChapter !== '全部' && q.chapter !== selectedChapter) return false
    if (search && !q.question.includes(search) && !Object.values(q.options).some((o) => o.includes(search))) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-purple-700">AI 學習模式</h2>
          <p className="text-sm text-gray-500 mt-0.5">諧音口訣 · 概念解析 · 錯誤選項說明</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl font-light leading-none"
          aria-label="關閉"
        >
          ✕
        </button>
      </div>

      {/* Chapter stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {chapterStats.map(({ chapter, total, memorizable }) => (
          <div key={chapter} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
            <div className="text-xs text-gray-500 mb-1 truncate">{chapter}</div>
            <div className="text-lg font-bold text-gray-800">{total} 題</div>
            <div className="text-xs text-yellow-600">
              ⚡ {Math.round((memorizable / total) * 100)}% 可無腦背
            </div>
          </div>
        ))}
      </div>

      {/* Status banners */}
      {studyAidsLoading && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
          正在載入 AI 學習輔助資料...
        </div>
      )}
      {studyAidsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {studyAidsError}
        </div>
      )}
      {!studyAidsLoading && !studyAidsError && studyAids === null && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <p className="font-medium mb-1">尚未產生 AI 學習輔助資料</p>
          <p>請先執行以下指令（約需 3-5 分鐘，費用約 $0.22）：</p>
          <code className="mt-1 block bg-amber-100 rounded px-2 py-1 text-xs font-mono">
            uv run generate_study_aids.py
          </code>
        </div>
      )}

      {/* Chapter filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['全部', ...chapters].map((ch) => (
          <button
            key={ch}
            onClick={() => setSelectedChapter(ch)}
            className={`text-sm px-3 py-1 rounded-full border transition-colors ${
              selectedChapter === ch
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
            }`}
          >
            {ch}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="搜尋題目或選項..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
      />

      {/* Question count */}
      <p className="text-xs text-gray-500">顯示 {filtered.length} / {questions.length} 題</p>

      {/* Question cards */}
      <div className="space-y-3">
        {filtered.map((q) => {
          const globalIdx = questions.indexOf(q)
          return (
            <QuestionCard
              key={globalIdx}
              question={q}
              aid={studyAids ? studyAids[String(globalIdx)] : undefined}
              imageUrl={imageMap ? imageMap[String(globalIdx)] : null}
            />
          )
        })}
      </div>

      {/* Bottom close button */}
      <div className="text-center pt-2 pb-4">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          關閉
        </button>
      </div>
    </div>
  )
}
