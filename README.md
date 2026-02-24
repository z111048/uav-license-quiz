# 無人機學科線上練習系統 (UAV License Quiz)

專為準備無人機學科考試設計的互動式練習系統，支援四種題庫版本，並具備「無腦背白名單」邏輯，幫助考生快速識別唯一正確選項。

🌐 **線上使用**：[https://z111048.github.io/uav-license-quiz/](https://z111048.github.io/uav-license-quiz/)

## 功能特色

- **四種題庫版本**：普通操作證、專業操作證、屆期換證、屆期換證（簡易），可即時切換
- **計時測驗**：每題 10 秒倒數，模擬考試壓力
- **閱讀模式**：直接瀏覽題目與答案，適合考前快速複習
- **錯題回顧**：練習結束後自動整理答錯題目
- **章節篩選**：可自選特定章節進行專項練習
- **即時反饋**：可選擇作答後立即顯示正解，或關閉以加快節奏
- **無腦背白名單**：演算法分析題庫，篩選出「只要看到該選項就一定是正確答案」的唯一解，並在閱讀模式標記 ⚡ 可無腦背
- **「以上皆是」策略分析**：自動分類含「以上皆是」選項的題目，區分可直接背（答案就是以上皆是）與陷阱題（以上皆是是錯誤選項），並附統計數字
- **AI 學習模式**（專業操作證）：透過 Claude Haiku API 為每題生成關鍵字提示、諧音口訣、概念解析、錯誤選項說明，支援章節篩選與關鍵字搜尋

## 開發

### 前置需求

- [Node.js](https://nodejs.org/) 22+
- [uv](https://docs.astral.sh/uv/)（Python 環境管理，用於題庫更新與 AI 輔助生成）

### 啟動開發伺服器

```bash
npm install
npm run dev
```

開啟 http://localhost:5173

### 更新題庫

從 CAA 官方網站自動下載最新 PDF 並重新處理所有版本：

```bash
uv run update_question_bank.py
```

執行後會：
1. 爬取 [CAA 題庫頁面](https://www.caa.gov.tw/Article.aspx?a=3833&lang=1) 取得最新 PDF 連結
2. 下載四個版本的 PDF 至 `ref/`（已存在且大小相符則跳過）
3. 解析 PDF 題目與答案，自動過濾頁碼等排版雜訊，計算白名單
4. 輸出至 `public/data/*.json`

### 生成 AI 學習輔助（專業操作證）

為專業操作證 588 題批次生成 AI 學習輔助資料（關鍵字、諧音口訣、解析）：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
uv run generate_study_aids.py
```

- 使用 Claude Haiku 4.5 API，費用約 $1.30
- 支援中途中斷後 resume（已完成題目自動跳過）
- 輸出至 `public/data/professional_study_aids.json`

### 建置

```bash
npm run build
```

## 技術架構

```
CAA 官網 PDF
    │
    ▼
update_question_bank.py   (uv Python：pdfplumber + requests + beautifulsoup4)
    │
    ▼
public/data/
├── general.json                    普通操作證
├── professional.json               專業操作證
├── renewal.json                    屆期換證
├── renewal_basic.json              屆期換證（簡易）
└── professional_study_aids.json    AI 學習輔助（選用）
    │                                   ↑
    │               generate_study_aids.py（Claude Haiku API）
    ▼
Vite + React + TypeScript  (Tailwind CSS v4)
```

**前端**：Vite + React + TypeScript + Tailwind CSS v4
**Python 工具**：uv 管理依賴（`pdfplumber`、`requests`、`beautifulsoup4`、`anthropic`、`tqdm`）
**部署**：GitHub Actions → GitHub Pages

## 專案結構

```
uav-license-quiz/
├── src/
│   ├── App.tsx                # 主狀態管理、view 切換
│   ├── types.ts               # TypeScript 型別定義
│   └── components/
│       ├── BankSelector.tsx   # 版本切換 UI
│       ├── SetupView.tsx      # 設定頁
│       ├── QuizView.tsx       # 計時作答
│       ├── ReadingView.tsx    # 閱讀模式
│       ├── WhitelistView.tsx  # 白名單查詢
│       ├── AllAboveView.tsx   # 「以上皆是」策略分析
│       ├── StudyView.tsx      # AI 學習模式
│       └── ResultView.tsx     # 成績報告
├── public/data/               # 題庫 JSON（納入版控）
├── update_question_bank.py    # 自動更新題庫腳本
├── generate_study_aids.py     # AI 學習輔助生成腳本（需 ANTHROPIC_API_KEY）
├── pyproject.toml             # uv Python 環境
└── .github/workflows/
    └── deploy.yml             # GitHub Pages 自動部署
```
