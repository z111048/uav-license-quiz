# 無人機學科線上練習系統 (UAV License Quiz)

近期更新（2026-04-12）

- 術科測驗模擬器（`public/exam-simulator-mr.html`）新增無人機飛行聲音合成（Web Audio API，不需外部音檔）：
  - 4 個馬達音頻庫（鋸齒波 + 方波 + 正弦波），各自微量失諧（±6–14 cents），重現四軸機特有的「拍頻」嗡鳴聲
  - 槳葉通過頻率（BPF）隨 `motorRpm` 線性縮放（38 Hz 怠速 → 275 Hz 懸停）；上升油門輸入使音調再微升 ≤22 Hz
  - 水平飛行速度驅動帶通白噪音，模擬氣流/推力風聲
  - 🔊/🔇 靜音切換按鈕，符合各平台音訊政策（首次互動後才初始化 AudioContext）
- 術科測驗模擬器（`public/exam-simulator-mr.html`）無人機 3D 模型全面重設計（DJI Phantom 風格）：
  - 八角形機身、玻璃穹頂、FPV 鏡頭、雲台吊艙、漸縮機臂、馬達定子/轉子鐘型蓋、三段式槳葉、航行燈（左紅右綠白尾）、雙橫管起落架
  - 螺旋槳轉向修正為 DJI 標準：SW/NE 順時針、NW/SE 逆時針
  - 三層柔邊 Blob 陰影移除，改用 Three.js 太陽光影 shadowmap
- 搖桿控制修正：延遲初始化（joystick zones 顯示後才呼叫 `initJoysticks()`），解決 nipplejs Y 軸永遠為 0 的問題
- 起落架高度補正（`GEAR_H = 0.162`）：確保落地時起落架腳墊貼地，飛行時正確懸空
- 移動時自動傾斜（`YXZ` 旋轉順序）：前進俯仰、側飛滾轉，符合真實飛行姿態
- 手動模式物理引擎：搖桿 → 目標傾斜角（最大 0.32 rad）→ 水平加速度（小角近似） → 帶阻尼速度 → 位置，有真實慣性感
- 馬達轉速動畫：進入手動模式時顯示「🔴 開機中…」，`motorRpm` lerp 至額定轉速後切換為操作提示
- 手動模式 UI 改善：
  - 黃色小人（術科督導員）進入手動模式時自動隱藏
  - 📊 HUD 按鈕移至畫面左側（📋 下方），手動/示範切換時自動移回右側
  - 兩個按鈕各自獨立控制（📋→術科流程面板，📊→HUD 面板）

專為準備無人機學科考試設計的互動式練習系統，支援四種題庫版本，並具備「無腦背白名單」邏輯，幫助考生快速識別唯一正確選項。

🌐 **線上使用**：[https://z111048.github.io/uav-license-quiz/](https://z111048.github.io/uav-license-quiz/)

## 功能特色

- **四種題庫版本**：普通操作證、專業操作證、屆期換證、屆期換證（簡易），可即時切換
- **計時測驗**：提供每題作答時間下拉選單，預設 10 秒倒數，模擬考試壓力
- **閱讀模式**：直接瀏覽題目與答案，適合考前快速複習
- **錯題回顧 + 再練一次**：練習結束後自動整理答錯題目，正確顯示您的答案與正確答案；可直接點擊「再練一次錯題」按鈕，立即針對本輪錯題重新練習（全部答對後按鈕自動消失）
- **章節篩選**：可自選特定章節進行專項練習
- **即時反饋**：可選擇作答後立即顯示正解，或關閉以加快節奏
- **答案提示**：作答前可隨時點擊「顯示/隱藏答案提示」查看正確答案文字，適合練習記憶
- **無腦背白名單**：演算法分析題庫，篩選出「只要看到該選項就一定是正確答案」的唯一解，並在閱讀模式標記 ⚡ 可無腦背
- **「以上皆是」策略分析**：自動分類含「以上皆是」選項的題目，區分可直接背（答案就是以上皆是）與陷阱題（以上皆是是錯誤選項），並附統計數字
- **AI 學習模式**（專業操作證）：透過 Claude Haiku API 為每題生成關鍵字提示、諧音口訣、概念解析、錯誤選項說明，支援章節篩選與關鍵字搜尋
- **題目示意圖**（專業操作證）：Gemini AI 為 371 道需要視覺輔助的題目（tier 1/2）生成 3D 技術示意圖，顯示於測驗、閱讀與 AI 學習模式；圖片托管於 Firebase Storage CDN。圖片均標註「AI 產製，僅供參考」免責說明
- **術科測驗模擬器**（無人多旋翼機基本級）：獨立 3D 互動模擬器，可體驗懸停、起降、航點飛行等術科測驗流程；支援自動導航與手動（W/A/S/D / 虛擬搖桿）兩種模式，多視角切換。DJI Phantom 風格無人機模型，具備馬達開機動畫、移動傾斜、起落架、Three.js 陰影等真實視覺效果；並搭載 **Web Audio 音效引擎**：馬達嗡鳴聲隨轉速變化音調，飛行時有氣流風噪，音量可靜音切換。於學科練習的設定頁底部入口開啟

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

### 生成題目示意圖（專業操作證，選用）

為 371 道題目（tier 1/2）生成 3D 示意圖並托管至 Firebase Storage：

```bash
# 前置：設定 API 金鑰與 Firebase 憑證
export GEMINI_API_KEY=AIza...
export FIREBASE_CREDENTIALS=~/.firebase/serviceAccountKey.json
export FIREBASE_BUCKET=your-project-id.firebasestorage.app

# ① 分析題目（只需執行一次，結果已納入版控）
uv run scripts/images/analyze_questions_gemini.py

# ② 生成圖片（371 張，費用約 NT$800；腳本預設預算 NT$300 約可生成 140 張，支援斷點續傳）
uv run scripts/images/generate_images_v2.py

# ③ 轉換 WebP + 上傳 Firebase
uv run scripts/images/convert_and_upload.py

# ④ 產生前端讀取的 URL manifest（納入版控）
uv run scripts/images/generate_image_manifest.py
```

- 圖片原檔（PNG / WebP）與 `webp_urls.json` 均已加入 `.gitignore`，不納入版控
- 只有 `public/data/professional_images.json`（CDN URL 對應表）需要 commit

### 測試

```bash
npm test              # 執行全部測試（單次）
npm run test:watch    # 開發時 watch 模式
```

使用 **Vitest + @testing-library/react**，測試放在 `src/test/`：
- `utils.test.ts` — `shuffleArray` / `normalizeBankData` 單元測試
- `QuizView.test.tsx` — 渲染、選項點擊、作答記錄、`onFinish` callback 驗證
- `exam-simulator.test.ts` — `public/exam-simulator.html` 靜態 HTML 結構與邏輯驗證
- `exam-simulator-mr.test.ts` — `public/exam-simulator-mr.html` 靜態 HTML 結構與邏輯驗證

### 建置

```bash
npm run build
```

### SEO / AEO

靜態 SEO 資產已預先設定，部署後即生效：

| 檔案 | 用途 |
|------|------|
| `index.html` | 標題、description、keywords、favicon link、Open Graph（含 og:image 尺寸）、Twitter Card（大圖預覽 + image:alt）、JSON-LD 結構化資料（WebApplication + FAQPage）、noscript 備援內容。**註：資源路徑使用 `/` 開頭，由 Vite 自動處理 base 路徑。** |
| `public/favicon.svg` | 瀏覽器 tab / 書籤圖示（SVG，俯視四旋翼造型，藍底白圖） |
| `public/apple-touch-icon.png` | iOS「加入主畫面」圖示（180×180px） |
| `public/icon-192.png` | PWA manifest 標準圖示（192×192px） |
| `public/icon-512.png` | PWA 高解析度圖示（512×512px） |
| `public/og-image.png` | 社群分享封面圖（1200×630px），用於 Line / Facebook / Twitter 分享預覽 |
| `public/robots.txt` | 允許爬蟲索引 `/uav-license-quiz/` 路徑，宣告 sitemap 位置 |
| `public/sitemap.xml` | 告知 Google / Bing 正式 URL 與更新頻率 |
| `public/site.webmanifest` | PWA 宣告，含 icons 陣列（192 + 512）與 scope，改善「加入主畫面」體驗 |

**AEO（Answer Engine Optimization）**：`index.html` 內含 `FAQPage` JSON-LD，提供 6 組問答，使 Google SGE、ChatGPT Search、Perplexity 等 AI 搜尋引擎可直接引用本站內容作為答案來源。

**Google Search Console**：已設定 `google-site-verification` meta tag。首次部署後需至 [Google Search Console](https://search.google.com/search-console) 完成驗證並提交 sitemap。

更新題庫後建議同步更新 `public/sitemap.xml` 中的 `<lastmod>` 日期，並至 Google Search Console 重新提交 sitemap。

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
├── renewal.json                    屆期換證（章節由 AI 協助分類）
├── renewal_basic.json              屆期換證（簡易）（章節由 AI 協助分類）
├── professional_study_aids.json    AI 學習輔助（選用）  ← generate_study_aids.py（Claude Haiku）
└── professional_images.json        圖片 CDN URL 對應表  ← scripts/images/ 流程（Gemini + Firebase）
    │
    ▼
Vite + React + TypeScript  (Tailwind CSS v4)
```

**前端**：Vite + React + TypeScript + Tailwind CSS v4
**Python 工具**：uv 管理依賴（`pdfplumber`、`requests`、`beautifulsoup4`、`anthropic`、`google-genai`、`firebase-admin`、`Pillow`、`tqdm`）
**部署**：GitHub Actions → GitHub Pages（`https://z111048.github.io/uav-license-quiz/`）

## 專案結構

```
uav-license-quiz/
├── index.html                 # SPA 入口；包含完整 SEO meta 標籤與 JSON-LD 結構化資料
├── src/
│   ├── App.tsx                # 主狀態管理、view 切換
│   ├── types.ts               # TypeScript 型別定義（含 OptionKey）
│   ├── utils.ts               # 共用工具：shuffleArray、normalizeBankData
│   ├── components/
│   │   ├── BankSelector.tsx   # 版本切換 UI
│   │   ├── SetupView.tsx      # 設定頁（fieldset/legend 無障礙、inline 錯誤提示）
│   │   ├── QuizView.tsx       # 計時作答（選項為 <button>，計時器 aria-label）
│   │   ├── ReadingView.tsx    # 閱讀模式（燈箱 role="dialog"）
│   │   ├── WhitelistView.tsx  # 白名單查詢
│   │   ├── AllAboveView.tsx   # 「以上皆是」策略分析（useMemo）
│   │   ├── StudyView.tsx      # AI 學習模式（QuestionCard memo，useMemo）
│   │   └── ResultView.tsx     # 成績報告
│   └── test/
│       ├── setup.ts           # Vitest + jest-dom 初始化
│       ├── utils.test.ts      # shuffleArray / normalizeBankData 單元測試
│       └── QuizView.test.tsx  # 元件測試
├── public/
│   ├── favicon.svg            # 瀏覽器圖示（SVG，俯視四旋翼）
│   ├── apple-touch-icon.png   # iOS 主畫面圖示（180×180）
│   ├── icon-192.png           # PWA 圖示（192×192）
│   ├── icon-512.png           # PWA 圖示（512×512）
│   ├── og-image.png           # 社群分享封面圖（1200×630）
│   ├── exam-simulator.html    # 術科測驗模擬器（固定翼/多旋翼通用版，靜態 HTML）
│   ├── exam-simulator-mr.html # 術科測驗模擬器（無人多旋翼機基本級，靜態 HTML）
│   ├── robots.txt             # 允許爬蟲索引，宣告 sitemap 位置
│   ├── sitemap.xml            # 網站地圖（供 Google / Bing 索引）
│   ├── site.webmanifest       # PWA 宣告（名稱、主題色、icons）
│   └── data/                  # 題庫 JSON（納入版控）
├── update_question_bank.py    # 自動更新題庫腳本
├── generate_study_aids.py     # AI 學習輔助生成腳本（需 ANTHROPIC_API_KEY）
├── scripts/
│   └── images/                # 題目示意圖生成流程（依序執行 ①→④）
│       ├── analyze_questions_gemini.py   # ① 題目分析，決定生圖優先級
│       ├── generate_images_v2.py         # ② Gemini 生圖（PNG，斷點續傳，預算保護）
│       ├── convert_and_upload.py         # ③ PNG→WebP + Firebase Storage 上傳
│       ├── generate_image_manifest.py    # ④ 產生 professional_images.json
│       └── preview_images.py             # 預覽工具（開發用）
├── pyproject.toml             # uv Python 環境
└── .github/workflows/
    └── deploy.yml             # GitHub Pages 自動部署
```
