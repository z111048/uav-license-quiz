import { useState } from 'react'

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
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">答案白名單</h2>
          <p className="text-sm text-gray-500 mt-1">
            看到這些選項內容，直接選它就對了 (唯一解)
          </p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-medium">
          ✕ 關閉
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜尋白名單關鍵字..."
          className="w-full p-2 border rounded bg-gray-50"
        />
      </div>

      <div className="h-96 overflow-y-auto space-y-2 pr-2 border rounded p-2 bg-gray-50">
        {filtered.length === 0 ? (
          <div className="text-gray-500 text-center py-4">目前沒有資料</div>
        ) : (
          filtered.map((item, i) => (
            <div
              key={i}
              className="p-2 bg-white border rounded text-gray-700 text-sm hover:bg-indigo-50 transition"
            >
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
