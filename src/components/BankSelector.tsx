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
          className={`w-full px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
            currentId === bank.id
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          {bank.label}
        </button>
      ))}
    </div>
  )
}
