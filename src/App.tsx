import { useState, useEffect, useCallback, useRef } from 'react'
import { BankData, BankConfig, Question, QuizSettings, UserRecord, ViewType, StudyAids, ImageMap, BANK_CONFIGS } from './types'
import { shuffleArray, normalizeBankData } from './utils'
import BankSelector from './components/BankSelector'
import SetupView from './components/SetupView'
import QuizView from './components/QuizView'
import ReadingView from './components/ReadingView'
import WhitelistView from './components/WhitelistView'
import AllAboveView from './components/AllAboveView'
import ResultView from './components/ResultView'
import StudyView from './components/StudyView'
import LicenseAdvisorView from './components/LicenseAdvisorView'

export default function App() {
  const [view, setView] = useState<ViewType>('advisor')
  const [bankData, setBankData] = useState<BankData | null>(null)
  const [currentBankId, setCurrentBankId] = useState<string>(BANK_CONFIGS[0].id)

  // Refs for use inside the popstate handler (avoids stale closure)
  const viewRef = useRef<ViewType>('advisor')
  const currentBankIdRef = useRef<string>(BANK_CONFIGS[0].id)
  const quizQueueRef = useRef<Question[]>([])
  const quizRecordsRef = useRef<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studyAids, setStudyAids] = useState<StudyAids | null>(null)
  const [studyAidsLoading, setStudyAidsLoading] = useState(false)
  const [studyAidsError, setStudyAidsError] = useState<string | null>(null)
  const [imageMap, setImageMap] = useState<ImageMap | null>(null)
  const [imageMapLoading, setImageMapLoading] = useState(false)

  // Quiz state
  const [quizQueue, setQuizQueue] = useState<Question[]>([])
  const [quizSettings, setQuizSettings] = useState<QuizSettings>({
    chapters: [],
    count: 50,
    instantFeedback: true,
    timeLimit: 30,
  })
  const [quizRecords, setQuizRecords] = useState<UserRecord[]>([])

  // Reading state
  const [readingChapters, setReadingChapters] = useState<string[]>([])

  // Keep refs in sync so the popstate handler always has fresh values
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => { currentBankIdRef.current = currentBankId }, [currentBankId])
  useEffect(() => { quizQueueRef.current = quizQueue }, [quizQueue])
  useEffect(() => { quizRecordsRef.current = quizRecords }, [quizRecords])

  // Navigate to a view while maintaining browser history.
  // Pass targetBankId when the bank is also changing (e.g. handleBankChange).
  // Use replace=true for redirects (guard fallbacks, initial URL).
  function navigateTo(newView: ViewType, targetBankId?: string, replace = false) {
    const bankId = targetBankId ?? currentBankIdRef.current
    const method = replace ? 'replaceState' : 'pushState'
    history[method]({ view: newView, bankId }, '', `#${newView}`)
    setView(newView)
  }

  // Attach popstate listener once on mount and set the initial URL hash.
  useEffect(() => {
    const validViews: ViewType[] = ['advisor', 'setup', 'quiz', 'reading', 'whitelist', 'allabove', 'study', 'result']
    const initialHash = window.location.hash.slice(1) as ViewType
    const initialView = validViews.includes(initialHash) ? initialHash : 'advisor'
    // Don't deep-link directly into stateful views — fall back to setup
    const safeInitial = (initialView === 'quiz' || initialView === 'result') ? 'setup' : initialView
    history.replaceState({ view: safeInitial, bankId: BANK_CONFIGS[0].id }, '', `#${safeInitial}`)
    if (safeInitial !== view) setView(safeInitial)

    function handlePopState(e: PopStateEvent) {
      let targetView = (e.state?.view as ViewType | undefined) ?? 'advisor'
      const targetBankId = (e.state?.bankId as string | undefined) ?? BANK_CONFIGS[0].id

      // Guard: stateful views need in-memory state
      if (targetView === 'quiz' && quizQueueRef.current.length === 0) targetView = 'setup'
      if (targetView === 'result' && quizRecordsRef.current.length === 0) targetView = 'setup'

      // Restore bank if it changed
      if (targetBankId !== currentBankIdRef.current) {
        setCurrentBankId(targetBankId)
        setStudyAids(null)
        setStudyAidsError(null)
        if (targetBankId !== 'professional') setImageMap(null)
      }

      setView(targetView)
      // Fix URL if we had to redirect (guard case)
      if (targetView !== (e.state?.view as ViewType)) {
        history.replaceState({ view: targetView, bankId: targetBankId }, '', `#${targetView}`)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
        setBankData(normalizeBankData(data))
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(`載入失敗：${err.message}`)
        setLoading(false)
      })
  }, [currentBank.file])

  // Fetch image map when professional bank is selected
  useEffect(() => {
    if (currentBankId !== 'professional') {
      setImageMap(null)
      return
    }
    if (imageMap !== null || imageMapLoading) return

    setImageMapLoading(true)
    const BASE_URL = import.meta.env.BASE_URL as string
    fetch(BASE_URL + 'data/professional_images.json')
      .then((res) => {
        if (res.status === 404) return null
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: ImageMap | null) => {
        if (data !== null) setImageMap(data)
        setImageMapLoading(false)
      })
      .catch(() => {
        setImageMapLoading(false)
      })
  }, [currentBankId, imageMap, imageMapLoading])

  const handleBankChange = useCallback((id: string) => {
    setCurrentBankId(id)
    setStudyAids(null)
    setStudyAidsError(null)
    if (id !== 'professional') setImageMap(null)
    navigateTo('setup', id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAdvisorSelectBank(bankId: string) {
    setCurrentBankId(bankId)
    navigateTo('setup', bankId)
  }

  function handleStart(settings: QuizSettings) {
    if (!bankData) return

    const { chapters, count } = settings
    let filtered = bankData.questions.filter((q) => chapters.includes(q.chapter))

    if (filtered.length === 0) return  // SetupView 已把關，這裡僅防禦

    const shuffled = shuffleArray(filtered)
    const queue = count === 'all' ? shuffled : shuffled.slice(0, count)

    setQuizQueue(queue)
    setQuizSettings(settings)
    navigateTo('quiz')
  }

  function handleReadingMode(chapters: string[]) {
    setReadingChapters(chapters)
    navigateTo('reading')
    loadStudyAids(currentBankId)
  }

  function handleFinish(records: UserRecord[]) {
    setQuizRecords(records)
    navigateTo('result')
  }

  function handleRestart() {
    navigateTo('setup')
  }

  function handleRetryWrong() {
    if (!bankData) return
    const wrongQuestions = quizRecords
      .filter((r) => !r.isCorrect)
      .map((r) => bankData.questions.find((q) => q.id === r.questionId && q.chapter === r.chapter))
      .filter((q): q is Question => q !== undefined)
    if (wrongQuestions.length === 0) return
    setQuizQueue(wrongQuestions)
    navigateTo('quiz')
  }

  function loadStudyAids(bankId: string) {
    if (studyAids !== null || studyAidsLoading) return
    setStudyAidsLoading(true)
    setStudyAidsError(null)
    const BASE_URL = import.meta.env.BASE_URL as string
    fetch(BASE_URL + `data/${bankId}_study_aids.json`)
      .then((res) => {
        if (res.status === 404) return null
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: StudyAids | null) => {
        if (data !== null) setStudyAids(data)
        setStudyAidsLoading(false)
      })
      .catch((err: Error) => {
        setStudyAidsError(`載入失敗：${err.message}`)
        setStudyAidsLoading(false)
      })
  }

  function handleStudyMode() {
    navigateTo('study')
    loadStudyAids(currentBankId)
  }

  return (
    <div className="bg-surface text-gray-900 min-h-screen font-sans antialiased">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3 shadow-md">
            <svg viewBox="0 0 32 32" className="w-8 h-8 text-white" fill="currentColor" aria-hidden="true">
              <rect x="14.5" y="3" width="3" height="26" rx="1.5"/>
              <rect x="3" y="14.5" width="26" height="3" rx="1.5"/>
              <circle cx="7" cy="7" r="4.5"/>
              <circle cx="25" cy="7" r="4.5"/>
              <circle cx="7" cy="25" r="4.5"/>
              <circle cx="25" cy="25" r="4.5"/>
              <circle cx="16" cy="16" r="4"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1.5">無人機操作證考照練習題庫</h1>
          <p className="text-gray-500 text-sm">民航局最新題庫｜普通／專業操作證、屆期換證｜倒數計時、章節篩選、錯題回顧</p>
        </header>

        {/* Bank Selector — always visible on setup view */}
        {(view === 'setup' || view === 'reading' || view === 'whitelist' || view === 'allabove' || view === 'study') && (
          <BankSelector
            banks={BANK_CONFIGS}
            currentId={currentBankId}
            onChange={handleBankChange}
          />
        )}

        {/* Advisor view — shown before bank data loads */}
        {view === 'advisor' && (
          <LicenseAdvisorView
            onSelectBank={handleAdvisorSelectBank}
            onSkip={() => navigateTo('setup')}
          />
        )}

        {/* Loading / Error state */}
        {view !== 'advisor' && loading && (
          <div className="bg-white rounded-xl shadow-lg p-12 flex flex-col items-center gap-3 text-gray-500">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-sm">載入題庫中...</span>
          </div>
        )}

        {view !== 'advisor' && error && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center text-red-500">
            {error}
            <br />
            <span className="text-sm text-gray-500">
              請先執行 <code className="bg-gray-100 px-1 rounded">uv run update_question_bank.py</code> 產生題庫資料。
            </span>
          </div>
        )}

        {/* Views */}
        {view !== 'advisor' && !loading && !error && bankData && (
          <>
            {view === 'setup' && (
              <SetupView
                questions={bankData.questions}
                whitelist={bankData.answer_option_whitelist}
                chapterNote={bankData.chapter_note}
                sourceUpdated={bankData.source_updated}
                currentBankId={currentBankId}
                onStart={handleStart}
                onReadingMode={handleReadingMode}
                onWhitelist={() => navigateTo('whitelist')}
                onAllAbove={() => navigateTo('allabove')}
                onStudyMode={handleStudyMode}
                onAdvisor={() => navigateTo('advisor')}
                onSimulator={() => {
                  const BASE_URL = import.meta.env.BASE_URL as string
                  window.open(BASE_URL + 'exam-simulator-mr.html', '_blank', 'noopener,noreferrer')
                }}
              />
            )}

            {view === 'quiz' && (
              <QuizView
                queue={quizQueue}
                allQuestions={bankData.questions}
                settings={quizSettings}
                imageMap={imageMap}
                onFinish={handleFinish}
              />
            )}

            {view === 'reading' && (
              <ReadingView
                questions={bankData.questions}
                selectedChapters={readingChapters}
                imageMap={imageMap}
                studyAids={studyAids}
                onClose={() => navigateTo('setup')}
              />
            )}

            {view === 'whitelist' && (
              <WhitelistView
                whitelist={bankData.answer_option_whitelist}
                onClose={() => navigateTo('setup')}
              />
            )}

            {view === 'allabove' && (
              <AllAboveView
                questions={bankData.questions}
                onClose={() => navigateTo('setup')}
              />
            )}

            {view === 'result' && (
              <ResultView
                records={quizRecords}
                onRestart={handleRestart}
                onRetryWrong={handleRetryWrong}
              />
            )}

            {view === 'study' && (
              <StudyView
                questions={bankData.questions}
                studyAids={studyAids}
                studyAidsLoading={studyAidsLoading}
                studyAidsError={studyAidsError}
                imageMap={imageMap}
                onClose={() => navigateTo('setup')}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
