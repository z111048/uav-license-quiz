import { BankConfig } from '../types'

interface Props {
  banks: BankConfig[]
  currentId: string
  onChange: (id: string) => void
}

export default function BankSelector({ banks, currentId, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
      {banks.map((bank) => (
        <button
          key={bank.id}
          onClick={() => onChange(bank.id)}
          className={`w-full px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-150 active:scale-[0.97] ${
            currentId === bank.id
              ? 'bg-brand border-brand text-white shadow-sm'
              : 'bg-white border-border text-gray-600 hover:border-brand hover:text-brand'
          }`}
        >
          {bank.label}
        </button>
      ))}
    </div>
  )
}
