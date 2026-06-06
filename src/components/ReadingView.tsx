import { useState } from 'react'
import { X } from 'lucide-react'
import { Question, ImageMap, StudyAids } from '../types'

interface Props {
  questions: Question[]
  selectedChapters: string[]
  imageMap?: ImageMap | null
  studyAids?: StudyAids | null
  onClose: () => void
}

export default function ReadingView({ questions, selectedChapters, imageMap, studyAids, onClose }: Props) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const filtered = questions.filter((q) => selectedChapters.includes(q.chapter))

  const grouped = selectedChapters.reduce<Record<string, Question[]>>((acc, ch) => {
    acc[ch] = filtered.filter((q) => q.chapter === ch)
    return acc
  }, {})

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      {/* Lightbox overlay */}
      {lightboxSrc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="題目示意圖放大檢視"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="題目示意圖（放大）"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxSrc(null)}
            aria-label="關閉"
          >
            <X size={28} />
          </button>
        </div>
      )}
      <div className="section-header">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">題庫閱讀模式</h2>
          <p className="text-sm text-gray-500 mt-0.5">含答案解析，適合複習理解</p>
        </div>
        <button onClick={onClose} className="btn-close">
          <X size={16} />
          關閉
        </button>
      </div>

      <div className="space-y-8">
        {selectedChapters.map((chapter) => {
          const chapterQuestions = grouped[chapter]
          if (!chapterQuestions || chapterQuestions.length === 0) return null

          return (
            <div key={chapter} className="mb-8">
              <h3 className="text-base font-semibold text-brand bg-brand-subtle px-4 py-2.5 rounded-lg mb-4 border-l-4 border-brand">
                {chapter} <span className="text-brand-dark font-normal text-sm">（共 {chapterQuestions.length} 題）</span>
              </h3>

              <div className="space-y-5">
                {chapterQuestions.map((q) => {
                  const globalIdx = questions.indexOf(q)
                  const imgUrl = globalIdx >= 0 ? imageMap?.[String(globalIdx)] : undefined
                  const aid = globalIdx >= 0 ? studyAids?.[String(globalIdx)] : undefined
                  return (
                  <div key={q.id} className="border border-border rounded-xl p-4 bg-white">
                    <div className="flex gap-3">
                      <span className="font-bold text-gray-400 text-xs min-w-[2rem] pt-1 shrink-0">
                        #{q.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <p className="font-semibold text-gray-800 leading-relaxed">{q.question}</p>
                          {q.can_memorize_directly && (
                            <span className="badge-brand shrink-0 whitespace-nowrap">⚡ 可直背</span>
                          )}
                        </div>

                        {imgUrl && (
                          <div className="mb-3">
                            <div className="cursor-zoom-in" onClick={() => setLightboxSrc(imgUrl)}>
                              <img
                                src={imgUrl}
                                alt="題目示意圖"
                                className="w-full rounded-lg border border-border object-contain bg-surface"
                                loading="lazy"
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">圖片由 AI 產製，僅供參考，可能與實際情況有所差異</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
                          {(Object.entries(q.options) as [string, string][]).map(([key, val]) => {
                            const isAnswer = key === q.answer
                            return (
                              <div
                                key={key}
                                className={`px-3 py-2 rounded-lg text-sm ${
                                  isAnswer
                                    ? 'bg-success-muted text-success-dark font-semibold border border-success'
                                    : 'text-gray-600 bg-surface'
                                }`}
                              >
                                <span className="font-bold mr-1">{key}.</span>{val}
                              </div>
                            )
                          })}
                        </div>

                        {aid?.explanation && (
                          <details className="group mt-2">
                            <summary className="cursor-pointer text-xs font-medium text-brand hover:text-brand-dark flex items-center gap-1 select-none list-none">
                              <span className="transition-transform group-open:rotate-90 inline-block">▶</span>
                              題目解析
                            </summary>
                            <div className="mt-2 px-3 py-2.5 bg-brand-subtle border border-brand-muted rounded-lg text-sm text-gray-700 leading-relaxed">
                              {aid.explanation}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 text-center">
        <button onClick={onClose} className="btn-dark btn-md">
          返回設定頁
        </button>
      </div>
    </div>
  )
}
