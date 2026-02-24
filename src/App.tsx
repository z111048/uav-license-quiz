import { useState, useEffect, useCallback } from 'react'
import { BankData, BankConfig, Question, QuizSettings, UserRecord, ViewType, BANK_CONFIGS } from './types'
import BankSelector from './components/BankSelector'
import SetupView from './components/SetupView'
import QuizView from './components/QuizView'
import ReadingView from './components/ReadingView'
import WhitelistView from './components/WhitelistView'
import AllAboveView from './components/AllAboveView'
import ResultView from './components/ResultView'

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function App() {
  const [view, setView] = useState<ViewType>('setup')
  const [bankData, setBankData] = useState<BankData | null>(null)
  const [currentBankId, setCurrentBankId] = useState<string>(BANK_CONFIGS[0].id)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Quiz state
  const [quizQueue, setQuizQueue] = useState<Question[]>([])
  const [quizSettings, setQuizSettings] = useState<QuizSettings>({
    chapters: [],
    count: 50,
    instantFeedback: true,
  })
  const [quizRecords, setQuizRecords] = useState<UserRecord[]>([])

  // Reading state
  const [readingChapters, setReadingChapters] = useState<string[]>([])

  const currentBank: BankConfig = BANK_CONFIGS.find((b) => b.id === currentBankId) ?? BANK_CONFIGS[0]

  // Fetch bank data when bank changes
  useEffect(() => {
    setLoading(true)
    setError(null)
    setBankData(null)

    fetch(currentBank.file)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: BankData | Question[]) => {
        if (Array.isArray(data)) {
          setBankData({ questions: data, answer_option_whitelist: [] })
        } else {
          setBankData(data)
        }
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(`載入失敗：${err.message}`)
        setLoading(false)
      })
  }, [currentBank.file])

  const handleBankChange = useCallback((id: string) => {
    setCurrentBankId(id)
    setView('setup')
  }, [])

  function handleStart(settings: QuizSettings) {
    if (!bankData) return

    const { chapters, count } = settings
    let filtered = bankData.questions.filter((q) => chapters.includes(q.chapter))

    if (filtered.length === 0) {
      alert('所選章節沒有題目，請重新選擇！')
      return
    }

    const shuffled = shuffleArray(filtered)
    const queue = count === 'all' ? shuffled : shuffled.slice(0, count)

    setQuizQueue(queue)
    setQuizSettings(settings)
    setView('quiz')
  }

  function handleReadingMode(chapters: string[]) {
    setReadingChapters(chapters)
    setView('reading')
  }

  function handleFinish(records: UserRecord[]) {
    setQuizRecords(records)
    setView('result')
  }

  function handleRestart() {
    setView('setup')
  }

  return (
    <div className="bg-gray-100 text-gray-800 min-h-screen font-sans">
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">線上題庫練習系統</h1>
          <p className="text-gray-500 text-sm">支援倒數計時、章節篩選與錯題回顧</p>
        </header>

        {/* Bank Selector — always visible on setup view */}
        {(view === 'setup' || view === 'reading' || view === 'whitelist' || view === 'allabove') && (
          <BankSelector
            banks={BANK_CONFIGS}
            currentId={currentBankId}
            onChange={handleBankChange}
          />
        )}

        {/* Loading / Error state */}
        {loading && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
            載入題庫中...
          </div>
        )}

        {error && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center text-red-500">
            {error}
            <br />
            <span className="text-sm text-gray-500">
              請先執行 <code className="bg-gray-100 px-1 rounded">uv run update_question_bank.py</code> 產生題庫資料。
            </span>
          </div>
        )}

        {/* Views */}
        {!loading && !error && bankData && (
          <>
            {view === 'setup' && (
              <SetupView
                questions={bankData.questions}
                whitelist={bankData.answer_option_whitelist}
                onStart={handleStart}
                onReadingMode={handleReadingMode}
                onWhitelist={() => setView('whitelist')}
                onAllAbove={() => setView('allabove')}
              />
            )}

            {view === 'quiz' && (
              <QuizView
                queue={quizQueue}
                settings={quizSettings}
                onFinish={handleFinish}
              />
            )}

            {view === 'reading' && (
              <ReadingView
                questions={bankData.questions}
                selectedChapters={readingChapters}
                onClose={() => setView('setup')}
              />
            )}

            {view === 'whitelist' && (
              <WhitelistView
                whitelist={bankData.answer_option_whitelist}
                onClose={() => setView('setup')}
              />
            )}

            {view === 'allabove' && (
              <AllAboveView
                questions={bankData.questions}
                onClose={() => setView('setup')}
              />
            )}

            {view === 'result' && (
              <ResultView
                records={quizRecords}
                queue={quizQueue}
                onRestart={handleRestart}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
