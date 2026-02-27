import { useState } from 'react'
import { Question, ImageMap } from '../types'

interface Props {
  questions: Question[]
  selectedChapters: string[]
  imageMap?: ImageMap | null
  onClose: () => void
}

export default function ReadingView({ questions, selectedChapters, imageMap, onClose }: Props) {
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
            className="absolute top-4 right-4 text-white text-3xl font-light leading-none"
            onClick={() => setLightboxSrc(null)}
            aria-label="關閉"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">題庫閱讀模式</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-medium">
          ✕ 關閉
        </button>
      </div>

      <div className="space-y-8">
        {selectedChapters.map((chapter) => {
          const chapterQuestions = grouped[chapter]
          if (!chapterQuestions || chapterQuestions.length === 0) return null

          return (
            <div key={chapter} className="mb-8">
              <h3 className="text-xl font-bold text-blue-800 bg-blue-50 p-3 rounded-lg mb-4 border-l-4 border-blue-600">
                {chapter} (共 {chapterQuestions.length} 題)
              </h3>

              <div className="space-y-6">
                {chapterQuestions.map((q) => {
                  const globalIdx = questions.indexOf(q)
                  const imgUrl = globalIdx >= 0 ? imageMap?.[String(globalIdx)] : undefined
                  return (
                  <div key={q.id} className="border-b border-gray-200 pb-4 last:border-0">
                    <div className="flex gap-2">
                      <span className="font-bold text-gray-500 text-sm min-w-[2rem] pt-1">
                        #{q.id}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <p className="font-bold text-gray-800 text-lg mb-2">{q.question}</p>
                          {q.can_memorize_directly && (
                            <span className="inline-block bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-bold ml-2 whitespace-nowrap shrink-0">
                              ⚡ 可無腦背
                            </span>
                          )}
                        </div>

                        {imgUrl && (
                          <div
                            className="mb-3 cursor-zoom-in"
                            onClick={() => setLightboxSrc(imgUrl)}
                          >
                            <img
                              src={imgUrl}
                              alt="題目示意圖"
                              className="max-w-[180px] rounded-lg border border-gray-200 object-contain bg-gray-50"
                              loading="lazy"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {(Object.entries(q.options) as [string, string][]).map(([key, val]) => {
                            const isAnswer = key === q.answer
                            return (
                              <div
                                key={key}
                                className={`p-2 rounded border border-transparent ${
                                  isAnswer
                                    ? 'text-green-700 font-bold bg-green-50 border-green-200'
                                    : 'text-gray-600'
                                }`}
                              >
                                {isAnswer && '✓ '}
                                <span className="font-semibold">{key}.</span> {val}
                              </div>
                            )
                          })}
                        </div>

                        <div className="mt-2 text-sm text-gray-500">
                          正確答案：
                          <span className="font-bold text-green-600 text-lg">{q.answer}</span>
                        </div>
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
        <button
          onClick={onClose}
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg shadow transition duration-200"
        >
          返回設定頁
        </button>
      </div>
    </div>
  )
}
