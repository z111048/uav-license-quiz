import { useState } from 'react'
import { X, Search } from 'lucide-react'

interface Props {
  whitelist: string[]
  onClose: () => void
}

export default function WhitelistView({ whitelist, onClose }: Props) {
  const [keyword, setKeyword] = useState('')

  const filtered = keyword
    ? whitelist.filter((item) => item.toLowerCase().includes(keyword.toLowerCase()))
    : whitelist

  return (
    <div className="page-card">
      <div className="section-header">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">答案白名單</h2>
          <p className="text-sm text-gray-500 mt-0.5">看到這些選項內容，直接選它就對了（唯一解）</p>
        </div>
        <button onClick={onClose} className="btn-close">
          <X size={16} />
          關閉
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜尋白名單關鍵字..."
          className="input pl-9"
        />
      </div>

      <div className="h-96 overflow-y-auto space-y-1.5 pr-1 rounded-lg border border-border p-2 bg-surface">
        {filtered.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-8">沒有符合的項目</div>
        ) : (
          filtered.map((item, i) => (
            <div
              key={i}
              className="px-3 py-2 bg-white border border-border rounded-lg text-sm text-gray-700 hover:border-brand hover:bg-brand-subtle transition-colors"
            >
              {item}
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3 text-right">共 {filtered.length} 筆</p>
    </div>
  )
}
