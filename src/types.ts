export type OptionKey = 'A' | 'B' | 'C' | 'D'

export interface Question {
  id: number
  question: string
  options: Record<OptionKey, string>
  answer: OptionKey
  chapter: string
  can_memorize_directly?: boolean
}

export interface BankData {
  questions: Question[]
  answer_option_whitelist: string[]
}

export interface BankConfig {
  id: string
  label: string
  file: string
}

export interface QuizSettings {
  chapters: string[]
  count: number | 'all'
  instantFeedback: boolean
}

export interface UserRecord {
  questionId: number
  question: string
  chapter: string
  options: Question['options']
  correctAnswer: OptionKey
  userAnswer: OptionKey | null
  isCorrect: boolean
  timeSpent: number
}

export type ViewType = 'setup' | 'quiz' | 'reading' | 'whitelist' | 'allabove' | 'result' | 'study'

export interface StudyAid {
  keywords: string
  mnemonic: string
  explanation: string
  wrong_options: Partial<Record<OptionKey, string>>
}

export type StudyAids = Record<string, StudyAid>

export type ImageMap = Record<string, string>

export const BANK_CONFIGS: BankConfig[] = [
  { id: 'general', label: '普通操作證', file: `${import.meta.env.BASE_URL}data/general.json` },
  { id: 'professional', label: '專業操作證', file: `${import.meta.env.BASE_URL}data/professional.json` },
  { id: 'renewal', label: '屆期換證', file: `${import.meta.env.BASE_URL}data/renewal.json` },
  { id: 'renewal_basic', label: '屆期換證（簡易）', file: `${import.meta.env.BASE_URL}data/renewal_basic.json` },
]
