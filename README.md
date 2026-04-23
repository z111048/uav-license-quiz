# 無人機學科線上練習系統 (UAV License Quiz)

近期更新（2026-04-23）

- **SEO 全面優化**：`index.html` 補充術科相關 SEO 標籤，讓 Google 正確辨識網站同時涵蓋學科 + 術科兩大功能：
  - `meta description`、Open Graph、Twitter Card 一律加入「多旋翼機術科測驗 3D 飛行模擬器」描述
  - `meta keywords` 新增 `術科測驗`、`無人機術科`、`飛行測驗`、`術科模擬器`、`多旋翼機術科`、`無人機飛行測驗` 六組關鍵字
  - JSON-LD WebApplication `featureList` 補充術科模擬器、RTH、ATTI/POS 飛行模式、風場模擬
  - JSON-LD `dateModified` 更新至 `2026-04-22`
  - FAQPage 新增第 7 題「無人機術科測驗要考什麼？如何準備？」
  - `<noscript>` 備用文字新增術科測驗準備段落（給 Bing 等非 JS 爬蟲）
  - `public/sitemap.xml` `<lastmod>` 更新至 `2026-04-22`

近期更新（2026-04-22）

- **題庫版本資訊顯示**：練習設定頁右上角新增灰色小字「共 N 題　題庫版本：YYYY/MM/DD」，讓使用者確認題庫是否最新
- **屆期換證 / 屆期換證（簡易）題庫更新**至 2026/04/07 官網版本（題數不變，內容為格式調整）
- `update_question_bank.py` 改進：
  - 新增 `--banks` 參數，可指定只更新特定題庫：`uv run update_question_bank.py --banks renewal renewal_basic`
  - SHA-256 雜湊比對取代舊版 Content-Length 比對，精確偵測官網是否有更新；hash 與更新日期一併寫入 JSON

近期更新（2026-04-14）

- 術科測驗模擬器（`public/exam-simulator-mr.html`）新增自動返航（RTH）、飛行模式切換、風場干擾：
  - **自動返航（RTH）**：按 `R` 鍵或點擊 🏠 返航 按鈕，無人機自動執行三段式返航流程：
    1. 爬升至安全高度（5m）
    2. GPS 導航飛回 H 點（原點）
    3. 自動降落並停槳
    - 中途可隨時取消；關機或切換示範模式時也會自動取消
  - **飛行模式切換**（`F` 鍵或 🎯/🛰 按鈕）：
    - **姿態模式（ATTI）**：純傾斜控制，風場會造成持續漂移
    - **定位模式（POS）**：啟用 GPS Hold，搖桿放開後自動回歸定位點；PD 控制器（Kp=0.6, Kd=0.25）自然抵抗風場漂移
  - **風場干擾**：💨 按鈕開啟風場設定面板，可調整風速（0–10 m/s）、來風方向（8 方位）、亂流強度（0–1×）。物理模型：速度以阻力鬆弛趨近風速（bounded drag-relative-to-wind），亂流為三頻率正弦疊加（零均值）

近期更新（2026-04-13）

- 術科測驗模擬器場地標線全面更新（`public/exam-simulator-mr.html`）：
  - **基本級（圖9）**：P1–P4 矩形（12×5m）改用**水藍色**雙框（外框 14×7m、內框 10×3m）；P1–P4 角點放置改良版交通錐（橘身、細白反光條、方形底盤）
  - **高級（圖10）**：新增**黃色**雙框（外框 16×16m、內框 8×8m）；新增**紅色**外框弧（r=8m，各自僅繪製到垂直中線 x=0，約 277°）與內圓環（r=4m）；移除 A/B 大型地面圓形標記
  - 白色場地邊界（15×15m）四角不再放置交通錐

- 術科測驗模擬器（`public/exam-simulator-mr.html`）手動控制與真機邏輯更新：
  - 模式切換與電源鍵分離：`modebtn` 只切換示範 / 手動模式，`powerbtn` 以 DJI 風格「短按一次，再長按」處理通電 / 關機
  - 通電後只亮燈不轉槳；必須在地面以 CSC 啟動馬達後，葉槳才會開始怠速旋轉
  - 電腦版 CSC 對應：
    - 內八：`S + D + ↓ + ←`
    - 外八：`S + A + ↓ + →`
  - 落地後不會一碰地立刻停槳；需持續下拉油門一小段時間才停槳
  - 左搖桿鍵盤綁定改為 `W/S` 升降、`A/D` 偏航；右搖桿維持前後左右平移，改由方向鍵控制
  - 手機版 CSC 判定已改為適合圓形虛擬搖桿的對角閾值；雙搖桿下內八 / 下外八現在可正常啟槳
  - HUD 新增 `CSC` 狀態列，會即時顯示 `未開機`、`請落地後操作`、`待命（下內八 / 下外八）`、`內八/外八偵測中` 與 `CSC 成立`
  - 手動模式前後左右移動速度已調快，提高傾角上限、降低水平阻力，手機操作更靈敏
  - 葉槳視覺轉速與飛行中負載聯動已調高，啟槳、爬升與傾斜飛行時更接近真實多旋翼觀感
- 術科測驗模擬器（`public/exam-simulator-mr.html`）新增無人機飛行聲音合成（Web Audio API，不需外部音檔）：
  - 4 個馬達音頻庫（鋸齒波 + 方波 + 正弦波），各自微量失諧（±6–14 cents），重現四軸機特有的「拍頻」嗡鳴聲
  - 槳葉通過頻率（BPF）隨 `motorRpm` 線性縮放（38 Hz 怠速 → 275 Hz 懸停）；上升油門輸入使音調再微升 ≤22 Hz
  - 水平飛行速度驅動帶通白噪音，模擬氣流/推力風聲
  - 🔊/🔇 靜音切換按鈕，符合各平台音訊政策；iPhone / iPad 會在首次手勢中重試 `AudioContext.resume()`，並於 HUD 顯示音訊狀態（未啟用 / 已啟用 / 已啟用(靜音) / 啟用失敗）
  - 注意：iPhone 若仍無聲，通常是裝置靜音模式、專注模式或媒體音量造成，並非模擬器本身故障
- 術科測驗模擬器（`public/exam-simulator-mr.html`）無人機 3D 模型全面重設計（DJI Phantom 風格）：
  - 八角形機身、玻璃穹頂、FPV 鏡頭、雲台吊艙、漸縮機臂、馬達定子/轉子鐘型蓋、三段式槳葉、航行燈（左紅右綠白尾）、雙橫管起落架
  - 螺旋槳轉向修正為 DJI 標準：SW/NE 順時針、NW/SE 逆時針
  - 三層柔邊 Blob 陰影移除，改用 Three.js 太陽光影 shadowmap
  - `H` 點白色降落圓盤現可正確接收無人機陰影，並新增更明顯的 `H` 字地面標示
- 搖桿控制修正：延遲初始化（joystick zones 顯示後才呼叫 `initJoysticks()`），解決 nipplejs Y 軸永遠為 0 的問題
- 起落架高度補正（`GEAR_H = 0.162`）：確保落地時起落架腳墊貼地，飛行時正確懸空
- 移動時自動傾斜（`YXZ` 旋轉順序）：前進俯仰、側飛滾轉，符合真實飛行姿態
- 手動模式物理引擎：搖桿 → 目標傾斜角（最大 0.32 rad）→ 水平加速度（小角近似） → 帶阻尼速度 → 位置，有真實慣性感
- 多旋翼模擬器加入顯式電源狀態機：
  - 進入手動模式時先執行開機序列：前後航行燈節奏閃爍、馬達分段升速、機身輕微抖動
  - 離開手動模式時先執行關機序列：馬達減速停轉、槳葉保留慣性拖尾、音高明顯下滑後才切回示範模式
- iPhone / iPad 旋轉螢幕時若方向改變，模擬器會自動重新載入頁面，避免偶發的非全螢幕顯示
- 手動模式 UI 改善：
  - 黃色小人（術科督導員）進入手動模式時自動隱藏
  - 📊 HUD 按鈕移至畫面左側（📋 下方），手動/示範切換時自動移回右側
  - 兩個按鈕各自獨立控制（📋→術科流程面板，📊→HUD 面板）

專為準備無人機學科考試設計的互動式練習系統，支援四種題庫版本，並具備「無腦背白名單」邏輯，幫助考生快速識別唯一正確選項。

🌐 **線上使用**：[https://z111048.github.io/uav-license-quiz/](https://z111048.github.io/uav-license-quiz/)

## 功能特色

- **四種題庫版本**：普通操作證、專業操作證、屆期換證、屆期換證（簡易），可即時切換；設定頁顯示題庫版本日期
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
- **術科測驗模擬器**（無人多旋翼機基本級）：獨立 3D 互動模擬器，可體驗懸停、起降、航點飛行等術科測驗流程；支援自動導航與手動兩種模式、多視角切換。DJI Phantom 風格無人機模型，具備獨立模式鍵 / 電源鍵、DJI 風格通電流程、地面 CSC 啟槳、落地後持續下拉油門停槳、航行燈閃爍、槳葉慣性拖尾、移動傾斜、起落架、Three.js 陰影、`H` 點字樣與降落區陰影等真實視覺效果。桌機鍵位為左搖桿 `W/S` 升降、`A/D` 偏航，右搖桿 `↑/↓/←/→` 平移；`R` 鍵觸發自動返航（RTH），`F` 鍵切換姿態/定位飛行模式；CSC 可用 `S + D + ↓ + ←`（內八）或 `S + A + ↓ + →`（外八），手機虛擬搖桿也支援下內八 / 下外八啟槳，HUD 會即時顯示 CSC 狀態。並搭載 **Web Audio 音效引擎**：馬達嗡鳴聲隨轉速變化音調，停機時有音高下滑效果，飛行時有氣流風噪，音量可靜音切換。**RTH**（自動返航）：一鍵爬升至安全高度後 GPS 導航回 H 點落地。**飛行模式**：姿態模式（無 GPS 輔助）或定位模式（GPS Hold 自動保位）。**風場模擬**：可設定風速、來風方向與亂流，測試姿態 vs 定位模式的抗風差異。iPhone / iPad 為避免旋轉後非全螢幕顯示，方向改變時會自動重新載入頁面。於學科練習的設定頁底部入口開啟

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
uv run update_question_bank.py                              # 更新全部四個題庫
uv run update_question_bank.py --banks renewal renewal_basic  # 只更新指定題庫
```

執行後會：
1. 爬取 [CAA 題庫頁面](https://www.caa.gov.tw/Article.aspx?a=3833&lang=1) 取得最新 PDF 連結與 SHA-256 雜湊值
2. 比對官網 SHA-256 與本地 PDF；完全相符則跳過下載（比舊版 Content-Length 比對更精確）
3. 解析 PDF 題目與答案，自動過濾頁碼等排版雜訊，計算白名單
4. 輸出至 `public/data/*.json`（含 `source_updated` 日期與 `source_sha256`）

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
