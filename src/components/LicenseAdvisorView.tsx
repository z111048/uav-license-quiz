import { useState } from 'react'

type Purpose = 'personal' | 'professional'
type AgeGroup = 'under16' | '16to17' | '18plus'
type ProfessionalLevel = 'basic' | 'advanced'
type WeightCategory = 'under2' | '2to15' | '15to25' | '25to150' | '150plus'
type HasNavigation = 'yes' | 'no'

interface AdvisorResult {
  emoji: string
  licenseLabel: string
  licenseClass: string
  needsExam: boolean
  examTypes: string[]
  recommendedBankId: string | null
  recommendedBankLabel: string | null
  description: string
  note?: string
}

interface Props {
  onSelectBank: (bankId: string) => void
  onSkip: () => void
}

type OptionCard<T> = { value: T; label: string; desc?: string }

function OptionGroup<T extends string>({
  options,
  onSelect,
}: {
  options: OptionCard<T>[]
  onSelect: (v: T) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className="w-full text-left px-5 py-4 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50 transition-colors group"
        >
          <div className="font-semibold text-gray-800 group-hover:text-blue-700">{opt.label}</div>
          {opt.desc && <div className="text-sm text-gray-500 mt-0.5">{opt.desc}</div>}
        </button>
      ))}
    </div>
  )
}

function StepHeader({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-blue-600' : i === step - 1 ? 'bg-blue-400' : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-1">步驟 {step} / {total}</p>
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
    </div>
  )
}

function computeResult(
  purpose: Purpose,
  ageGroup: AgeGroup | null,
  professionalLevel: ProfessionalLevel | null,
  weightCategory: WeightCategory | null,
  hasNavigation: HasNavigation | null,
): AdvisorResult {
  if (purpose === 'professional') {
    if (professionalLevel === 'basic') {
      return {
        emoji: '🏢',
        licenseLabel: '專業基本級操作證',
        licenseClass: '依機體重量分 Ia / I / Ib / II / III',
        needsExam: true,
        examTypes: ['學科測驗', '術科測驗', '體格檢查'],
        recommendedBankId: 'professional',
        recommendedBankLabel: '專業操作證',
        description: '執行業務需取得「專業基本級操作證」。須年滿18歲，通過學科、術科測驗及體格檢查。',
      }
    } else {
      return {
        emoji: '🚀',
        licenseLabel: '專業高級操作證',
        licenseClass: '可執行例外限制排除（視距外、夜間飛行等）',
        needsExam: true,
        examTypes: ['學科測驗', '術科測驗（高級）', '體格檢查'],
        recommendedBankId: 'professional',
        recommendedBankLabel: '專業操作證',
        description: '專業高級操作證可執行例外限制排除作業（視距外、距地面400呎以上、夜間飛行、人群上空等）。須先取得基本級操作證。',
        note: '學科測驗內容與基本級相同，建議從「專業操作證」題庫開始練習。',
      }
    }
  }

  // Personal use
  if (ageGroup === 'under16') {
    return {
      emoji: '❌',
      licenseLabel: '無法申請操作證',
      licenseClass: '',
      needsExam: false,
      examTypes: [],
      recommendedBankId: null,
      recommendedBankLabel: null,
      description: '未滿16歲無法申請操作證。個人休閒飛行須在持有操作證之人員監督下進行，且僅限未達2公斤的無人機。',
    }
  }

  if (ageGroup === '16to17') {
    return {
      emoji: '📘',
      licenseLabel: '學習操作證',
      licenseClass: '限個人休閒用、需監督',
      needsExam: true,
      examTypes: ['學科測驗'],
      recommendedBankId: 'general',
      recommendedBankLabel: '普通操作證',
      description: '16–17歲可申請「學習操作證」，需通過學科測驗。飛行時須有持有正式操作證之人員陪同監督。學科內容與普通操作證相同。',
    }
  }

  // 18+
  if (weightCategory === 'under2') {
    if (hasNavigation === 'no') {
      return {
        emoji: '✅',
        licenseLabel: '免操作證',
        licenseClass: '未達2公斤且未裝置導航設備',
        needsExam: false,
        examTypes: [],
        recommendedBankId: null,
        recommendedBankLabel: null,
        description: '恭喜！您的情況不需要操作證。個人休閒飛行、未達2公斤且未裝置導航設備的無人機，依法免操作證。',
        note: '仍須遵守民用航空法相關規定，例如禁飛區、飛行高度限制等。',
      }
    } else {
      return {
        emoji: '📋',
        licenseLabel: '普通操作證 Ia',
        licenseClass: '未達2公斤（裝置導航設備）',
        needsExam: true,
        examTypes: ['學科測驗'],
        recommendedBankId: 'general',
        recommendedBankLabel: '普通操作證',
        description: '未達2公斤但裝置導航設備，個人休閒需取得「普通操作證 Ia」。只需通過學科測驗即可，無術科及體格檢查。',
      }
    }
  }

  if (weightCategory === '2to15') {
    return {
      emoji: '📋',
      licenseLabel: '普通操作證 I',
      licenseClass: '2公斤以上、未達15公斤',
      needsExam: true,
      examTypes: ['學科測驗'],
      recommendedBankId: 'general',
      recommendedBankLabel: '普通操作證',
      description: '2至15公斤的無人機，個人休閒需取得「普通操作證 I」。只需通過學科測驗即可，無術科及體格檢查。',
    }
  }

  const classMap: Record<string, string> = {
    '15to25': 'Ib（15–25公斤）',
    '25to150': 'II（25–150公斤）',
    '150plus': 'III（150公斤以上）',
  }

  return {
    emoji: '🏢',
    licenseLabel: '專業基本級操作證',
    licenseClass: classMap[weightCategory ?? ''] ?? '',
    needsExam: true,
    examTypes: ['學科測驗', '術科測驗', '體格檢查'],
    recommendedBankId: 'professional',
    recommendedBankLabel: '專業操作證',
    description: `${classMap[weightCategory ?? '']}的無人機，即使個人休閒使用也需取得「專業基本級操作證」，流程與業務用相同，須通過學科、術科測驗及體格檢查。`,
  }
}

export default function LicenseAdvisorView({ onSelectBank, onSkip }: Props) {
  const [step, setStep] = useState(1)
  const [purpose, setPurpose] = useState<Purpose | null>(null)
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null)
  const [weightCategory, setWeightCategory] = useState<WeightCategory | null>(null)
  const [result, setResult] = useState<AdvisorResult | null>(null)

  // Determine total steps dynamically
  function getTotalSteps() {
    if (purpose === 'professional') return 2
    if (ageGroup === '18plus') {
      if (weightCategory === 'under2') return 4
      return 3
    }
    return 2
  }

  function handlePurpose(v: Purpose) {
    setPurpose(v)
    setStep(2)
  }

  function handleAge(v: AgeGroup) {
    setAgeGroup(v)
    if (v !== '18plus') {
      const r = computeResult('personal', v, null, null, null)
      setResult(r)
      setStep(99)
    } else {
      setStep(3)
    }
  }

  function handleProfessionalLevel(v: ProfessionalLevel) {
    const r = computeResult('professional', null, v, null, null)
    setResult(r)
    setStep(99)
  }

  function handleWeight(v: WeightCategory) {
    setWeightCategory(v)
    if (v === 'under2') {
      setStep(4)
    } else {
      const r = computeResult('personal', '18plus', null, v, null)
      setResult(r)
      setStep(99)
    }
  }

  function handleNavigation(v: HasNavigation) {
    const r = computeResult('personal', '18plus', null, 'under2', v)
    setResult(r)
    setStep(99)
  }

  function handleRestart() {
    setStep(1)
    setPurpose(null)
    setAgeGroup(null)
    setWeightCategory(null)
    setResult(null)
  }

  const totalSteps = getTotalSteps()

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">🪁 我需要考哪種操作證？</h2>
          <p className="text-sm text-gray-500 mt-0.5">回答幾個問題，幫您找到對應的題庫</p>
        </div>
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-blue-600 underline shrink-0 ml-4"
        >
          跳過診斷
        </button>
      </div>

      {/* Step 1: Purpose */}
      {step === 1 && (
        <>
          <StepHeader step={1} total={2} title="您飛無人機的主要目的是？" />
          <OptionGroup<Purpose>
            options={[
              {
                value: 'personal',
                label: '🎮 個人休閒娛樂',
                desc: '自己玩、拍攝家庭影片、戶外攝影等非商業活動',
              },
              {
                value: 'professional',
                label: '🏢 業務執行',
                desc: '代表政府機關、學校或法人執行業務（測量、噴藥、搜救等）',
              },
            ]}
            onSelect={handlePurpose}
          />
        </>
      )}

      {/* Step 2a: Age (personal) */}
      {step === 2 && purpose === 'personal' && (
        <>
          <StepHeader step={2} total={totalSteps} title="您的年齡？" />
          <OptionGroup<AgeGroup>
            options={[
              { value: 'under16', label: '未滿16歲' },
              { value: '16to17', label: '16–17 歲' },
              { value: '18plus', label: '18歲以上' },
            ]}
            onSelect={handleAge}
          />
        </>
      )}

      {/* Step 2b: Professional level */}
      {step === 2 && purpose === 'professional' && (
        <>
          <StepHeader step={2} total={2} title="您要取得哪個等級的操作證？" />
          <OptionGroup<ProfessionalLevel>
            options={[
              {
                value: 'basic',
                label: '基本級',
                desc: '一般業務飛行（視距內、日間、非人群上空）',
              },
              {
                value: 'advanced',
                label: '高級',
                desc: '例外限制排除：視距外、夜間、400呎以上、人群上空等',
              },
            ]}
            onSelect={handleProfessionalLevel}
          />
        </>
      )}

      {/* Step 3: Weight */}
      {step === 3 && (
        <>
          <StepHeader step={3} total={totalSteps} title="您的無人機最大起飛重量？" />
          <OptionGroup<WeightCategory>
            options={[
              { value: 'under2', label: '未達 2 公斤', desc: '例如大多數消費級空拍機' },
              { value: '2to15', label: '2 公斤以上、未達 15 公斤' },
              { value: '15to25', label: '15 公斤以上、未達 25 公斤' },
              { value: '25to150', label: '25 公斤以上、未達 150 公斤' },
              { value: '150plus', label: '150 公斤以上' },
            ]}
            onSelect={handleWeight}
          />
        </>
      )}

      {/* Step 4: Navigation equipment */}
      {step === 4 && (
        <>
          <StepHeader step={4} total={4} title="您的無人機是否裝置導航設備？" />
          <p className="text-sm text-gray-500 mb-4">
            導航設備指 GPS、慣性導航系統（INS）等自動定位設備，多數具備「懸停功能」的無人機均已內建。
          </p>
          <OptionGroup<HasNavigation>
            options={[
              { value: 'yes', label: '是，有裝置導航設備（如 GPS 懸停）' },
              { value: 'no', label: '否，無導航設備（純手動/玩具型）' },
            ]}
            onSelect={handleNavigation}
          />
        </>
      )}

      {/* Result */}
      {step === 99 && result && (
        <div>
          <div
            className={`rounded-xl p-5 mb-5 ${
              result.needsExam
                ? 'bg-blue-50 border-2 border-blue-200'
                : result.recommendedBankId === null && result.licenseLabel !== '免操作證'
                ? 'bg-red-50 border-2 border-red-200'
                : 'bg-green-50 border-2 border-green-200'
            }`}
          >
            <div className="text-3xl mb-2">{result.emoji}</div>
            <div className="text-xl font-bold text-gray-800 mb-1">{result.licenseLabel}</div>
            {result.licenseClass && (
              <div className="text-sm font-medium text-gray-500 mb-3">{result.licenseClass}</div>
            )}
            <p className="text-gray-700 text-sm leading-relaxed">{result.description}</p>
            {result.note && (
              <p className="mt-2 text-sm text-gray-500 italic">💡 {result.note}</p>
            )}

            {result.needsExam && result.examTypes.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {result.examTypes.map((t) => (
                  <span key={t} className="bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {result.recommendedBankId ? (
            <div>
              <p className="text-sm text-gray-600 mb-3 font-medium">
                📚 建議練習題庫：<span className="text-blue-600">{result.recommendedBankLabel}</span>
              </p>
              <button
                onClick={() => onSelectBank(result.recommendedBankId!)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition duration-200 mb-3"
              >
                前往「{result.recommendedBankLabel}」題庫練習 →
              </button>
            </div>
          ) : (
            <button
              onClick={onSkip}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg shadow transition duration-200 mb-3"
            >
              瀏覽所有題庫
            </button>
          )}

          <button
            onClick={handleRestart}
            className="w-full text-sm text-gray-400 hover:text-gray-600 py-2"
          >
            ↩ 重新診斷
          </button>
        </div>
      )}

      {/* Back button (steps 2+, not result) */}
      {step > 1 && step !== 99 && (
        <button
          onClick={() => {
            if (step === 2) { setStep(1); setPurpose(null) }
            else if (step === 3) { setStep(2); setAgeGroup(null) }
            else if (step === 4) { setStep(3); setWeightCategory(null) }
          }}
          className="mt-4 text-sm text-gray-400 hover:text-gray-600"
        >
          ← 上一步
        </button>
      )}
    </div>
  )
}
