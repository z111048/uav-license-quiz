# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Frontend development:**
```bash
npm install        # 安裝依賴（首次或 package.json 變更後）
npm run dev        # 啟動開發伺服器（http://localhost:5173）
npm run build      # 建置靜態檔案到 dist/
npm test           # 執行測試（Vitest，單次）
npm run test:watch # 執行測試（watch 模式）
```

**Update question bank data** (auto-download latest PDFs from CAA and regenerate all 4 JSON files):
```bash
uv run update_question_bank.py
```

**Generate AI study aids for professional bank** (requires `ANTHROPIC_API_KEY`; outputs `public/data/professional_study_aids.json`):
```bash
export ANTHROPIC_API_KEY=sk-ant-...
uv run generate_study_aids.py
```

**Legacy single-bank processing** (after manually editing `question_bank.json`):
```bash
python process_question_bank.py
```

**Generate professional question images** (requires `GEMINI_API_KEY` + Firebase setup; scripts in `scripts/images/`):
```bash
# ① 分析題目，決定每題要不要生圖（輸出 professional_image_analysis.json）
uv run scripts/images/analyze_questions_gemini.py

# ② 生成 PNG（tier 1 & 2，斷點續傳，預算保護）
uv run scripts/images/generate_images_v2.py
uv run scripts/images/generate_images_v2.py --indices 240 411  # 指定重跑特定題號

# ③ 轉換 WebP + 上傳 Firebase Storage（需設定 FIREBASE_CREDENTIALS / FIREBASE_BUCKET）
uv run scripts/images/convert_and_upload.py

# ④ 產生前端讀取的 URL manifest
uv run scripts/images/generate_image_manifest.py

# 預覽生成結果（開發用）
uv run scripts/images/preview_images.py
```

## Architecture

### Data flow
```
CAA website PDF  →  update_question_bank.py  →  public/data/*.json       →  Vite React app
                     (uv Python script)           (4 bank versions)          (fetches on load)

                     Claude Haiku API
                          ↓
                  generate_study_aids.py   →  public/data/professional_study_aids.json
                  (professional bank only,      (key = 0-based array index as string)
                   ANTHROPIC_API_KEY required)

                     Gemini Flash API
                          ↓
          scripts/images/analyze_questions_gemini.py  →  professional_image_analysis.json
                          ↓
          scripts/images/generate_images_v2.py        →  public/data/images/professional/{idx}.png  (gitignored)
                          ↓
          scripts/images/convert_and_upload.py        →  Firebase Storage (WebP) + webp_urls.json   (gitignored)
                          ↓
          scripts/images/generate_image_manifest.py   →  public/data/professional_images.json
                          ↓                               (committed; key = 0-based index string, value = CDN URL)
                     Vite React app  (QuizView / ReadingView / StudyView)
```

`update_question_bank.py` scrapes the latest PDFs from `https://www.caa.gov.tw/Article.aspx?a=3833&lang=1`, parses them with pdfplumber, and computes the **memorization whitelist** (answer options that appear *only* as correct answers, never as distractors). Questions whose correct answer is in this whitelist get `can_memorize_directly: true`.

**Scraping notes (CAA website quirks):**
- PDF filenames are in the anchor's `title` attribute, not the visible link text — `get_text()` returns download metadata (size/date), not the filename
- Anchor `href` values are relative (`../FileAtt.ashx?...`), resolved with `urllib.parse.urljoin`
- DOCX/ODT files appear before PDF on the page; filtered by checking `title.lower().endswith(".pdf")`

**PDF format differences:**
- `general` / `professional`: chapter-based structure (`第X章 ...`), question numbers restart at 1 per chapter, answer section detected by `第X章 ...答案` header
- `renewal` / `renewal_basic`: no chapter headings, sequential numbering 1–N, answer section detected by last occurrence of `答案`
- `renewal` uses `N text` format (no dot after number); `renewal_basic` uses `N. text`
- Some questions in `renewal` have a page break between the number and question text (`175\n題目...`), normalized before parsing

**PDF page number artifact:**
- pdfplumber extracts page footer numbers as plain text lines; these can end up captured inside option D or question text (e.g. `'800 呎。5'` where `5` is a page number)
- Two-layer defence in the parser:
  1. Standalone digit-only lines are stripped before regex matching (`re.sub(r"(?m)^\s*\d+\s*$\n?", "", ...)`)
  2. `_clean_text()` helper strips any remaining trailing digits after Chinese sentence-ending punctuation (`re.sub(r"(?<=[。？！])\d+$", "", ...)`) applied to every option and question text at extraction time
- History: `professional.json` had 97 tail-embedded and 4 mid-text occurrences manually corrected in February 2026; the stale whitelist (generated before cleanup) had 25 ghost entries — both were fixed and the whitelist recomputed from clean data (February 2026)

### Project structure
```
uav-license-quiz/
├── src/
│   ├── main.tsx           # React entry point
│   ├── App.tsx            # Main state management, view routing
│   ├── types.ts           # TypeScript type definitions + BANK_CONFIGS (includes OptionKey)
│   ├── utils.ts           # Shared utilities: shuffleArray, normalizeBankData
│   ├── index.css          # Tailwind v4 import + custom styles
│   ├── components/
│   │   ├── BankSelector.tsx   # Bank version tabs
│   │   ├── SetupView.tsx      # Chapter selection, settings (fieldset/legend, inline error state)
│   │   ├── QuizView.tsx       # Timed quiz (10s per question); options are <button> elements
│   │   ├── ReadingView.tsx    # Browse all questions with answers (lightbox role="dialog")
│   │   ├── WhitelistView.tsx  # Searchable whitelist
│   │   ├── AllAboveView.tsx   # "以上皆是" strategy analysis (useMemo for derived lists)
│   │   ├── StudyView.tsx      # AI study mode; QuestionCard wrapped with memo(), useMemo for filtered/stats
│   │   └── ResultView.tsx     # Score summary + wrong question review + retry wrong button
│   └── test/
│       ├── setup.ts           # Vitest + @testing-library/jest-dom initialisation; scrollIntoView/scrollTo stubs
│       ├── utils.test.ts      # Unit tests for shuffleArray and normalizeBankData (8 tests)
│       └── QuizView.test.tsx  # Component tests: render, option buttons, answer recording, onFinish (6 tests)
├── public/
│   ├── favicon.svg            # Browser tab / bookmark icon (SVG, top-down quadcopter)
│   ├── apple-touch-icon.png   # iOS home screen icon (180×180)
│   ├── icon-192.png           # PWA manifest icon (192×192)
│   ├── icon-512.png           # PWA manifest icon (512×512)
│   ├── og-image.png           # Social sharing cover (1200×630)
│   ├── robots.txt             # SEO: allow all crawlers, declare sitemap location
│   ├── sitemap.xml            # SEO: canonical URL for Google/Bing indexing
│   ├── site.webmanifest       # PWA manifest (name, short_name, theme_color, icons)
│   └── data/                  # JSON files served to the app (committed)
│       ├── general.json
│       ├── professional.json
│       ├── renewal.json
│       ├── renewal_basic.json
│       └── professional_study_aids.json  # AI study aids (optional, generate separately)
├── index.html             # SPA entry point; contains all SEO meta tags + JSON-LD
├── ref/                   # Reference files (PDFs are gitignored)
├── pyproject.toml         # uv Python environment (Pillow, firebase-admin, google-genai, anthropic...)
├── update_question_bank.py    # Auto-download and process all banks
├── generate_study_aids.py     # Batch-generate AI study aids via Claude Haiku API
├── scripts/
│   └── images/                # 圖片生成流程（依序執行 ①→④）
│       ├── analyze_questions_gemini.py   # ① 題目分析 → professional_image_analysis.json
│       ├── generate_images_v2.py         # ② Gemini 生圖 → PNG（斷點續傳、預算保護）
│       ├── convert_and_upload.py         # ③ PNG→WebP + Firebase Storage 上傳
│       ├── generate_image_manifest.py    # ④ 產生 professional_images.json（CDN URL map）
│       └── preview_images.py             # 預覽工具（開發用）
└── # Legacy files (kept for backwards compatibility)
    ├── process_question_bank.py
    ├── question_bank.json
    └── process_question_bank.json
```

### Frontend stack
- **Vite + React + TypeScript** — build tooling
- **Tailwind CSS v4** — styling via `@tailwindcss/vite` plugin
- **Vitest + @testing-library/react** — unit and component tests; `defineConfig` imported from `vitest/config` in `vite.config.ts` so the `test` block is typed; jsdom environment; `Element.prototype.scrollIntoView` and `window.scrollTo` stubbed in `src/test/setup.ts`
- **Main container**: `max-w-5xl mx-auto` in `App.tsx` — constrains content width to 1024px on desktop

### View management
`App.tsx` manages a `view: ViewType` state and conditionally renders one of seven components:
- `SetupView` — chapter selection, settings, entry points. Chapter checkboxes wrapped in `<fieldset>`/`<legend>`; question-count `<select>` linked to its `<label>` via `id`/`htmlFor`. Validation is done locally with `startError` state — invalid starts show an inline `role="alert"` error block instead of `alert()`
- `QuizView` — timed question answering (10s per question). Answer options rendered as native `<button type="button">` elements (keyboard-accessible). Timer `<div>` has `aria-label="剩餘時間 N 秒" aria-live="off"`
- `ReadingView` — browse all questions with answers shown. Lightbox overlay has `role="dialog" aria-modal="true" aria-label="..."`
- `WhitelistView` — searchable list of memorizable answer options
- `AllAboveView` — "以上皆是" strategy analysis (questions classified at runtime into "can memorize" vs "trap"); derived lists computed with `useMemo`
- `StudyView` — AI study mode: chapter stats, per-question expandable cards with keywords/mnemonic/explanation/wrong-option notes. AI aid section is **expanded by default** (`useState(true)`); four sections rendered as distinct colored blocks (🔑 blue / 🎵 green / 💡 amber / ❌ red), laid out in a 2-column grid on desktop (keywords + mnemonic side-by-side; explanation + wrong-options full-width via `sm:col-span-2`). `chapters`, `chapterStats`, `filtered` all use `useMemo`; `QuestionCard` wrapped with `memo()`
- `ResultView` — score summary and wrong-question review; shows an amber "再練一次錯題（N 題）" button when there are wrong answers (hidden when all correct); clicking calls `onRetryWrong` which rebuilds `quizQueue` from the current `quizRecords` (timed-out questions included as wrong) and navigates back to `QuizView`

`BankSelector` appears above the setup/reading/whitelist/allabove/study views for switching between the 4 bank versions. Switching resets to setup view and triggers a new fetch.

### BankSelector layout
Uses `grid grid-cols-2 sm:grid-cols-4 gap-2` so the four bank buttons form a **2×2 grid on mobile** and a single row on desktop (≥ 640px). Each button has `w-full` to fill its grid cell. The 2×2 pairing is semantically natural: 普通操作證 / 專業操作證 on row 1, and the two 屆期換證 variants on row 2. The previous `flex flex-wrap` layout caused the widest button (屆期換證（簡易）) to wrap onto its own line on 375px screens, appearing isolated.

### Types

`src/types.ts` exports:
- `OptionKey = 'A' | 'B' | 'C' | 'D'` — used for `Question.answer`, `UserRecord.correctAnswer`/`userAnswer`, `StudyAid.wrong_options`. Eliminates `as 'A'|'B'|'C'|'D'` casts throughout the codebase.
- `Question`, `BankData`, `UserRecord`, `StudyAid`, `StudyAids`, `ImageMap`, `ViewType`, `QuizSettings`, `BankConfig`, `BANK_CONFIGS`

### Utilities

`src/utils.ts` exports:
- `shuffleArray<T>(array: T[]): T[]` — Fisher-Yates in-place shuffle on a copy; used in `App.tsx` to randomise quiz queue
- `normalizeBankData(raw: BankData | Question[]): BankData` — wraps legacy `Question[]` format with empty whitelist; used in the fetch handler in `App.tsx`

### Data formats

`public/data/*.json` (app reads these):
```json
{
  "questions": [{ "id": 1, "question": "...", "options": {"A": "...", "B": "..."}, "answer": "A", "chapter": "...", "can_memorize_directly": true }],
  "answer_option_whitelist": ["唯一正確選項文字", ...]
}
```

The app also supports the legacy array format for backwards compatibility (`normalizeBankData` in `src/utils.ts` handles the conversion).

`public/data/professional_study_aids.json` (generated by `generate_study_aids.py`):
```json
{
  "0": {"keywords": "...", "mnemonic": "...", "explanation": "...", "wrong_options": {"A": "...", "B": "..."}},
  "1": { ... }
}
```
Keys are **0-based array indices** into `professional.json`'s `questions` array (NOT `q.id`, which restarts per chapter). The frontend looks up aids via `questions.indexOf(q)`.

### QuizView scroll behaviour
- On every question advance, `window.scrollTo({ top: 0, behavior: 'instant' })` is called (inside the `index`-dependent `useEffect`) to reset scroll position before the new question renders. Without this, the user's scroll position from the previous question carries over.
- The countdown timer uses `<span className="inline-block w-8 text-right">` with a fixed width. This prevents a layout shift when the display transitions from two characters ("10") to one character ("9"). On mobile browsers (especially iOS Safari), layout shifts during an active scroll gesture can interrupt momentum scrolling, creating the illusion that the page is snapping back upward.

### QuizView touch interaction design
Three problems occur on mobile when the "Next question" button appears conditionally after answering:
1. The button can appear in the same screen area where the user's finger just lifted (option D), causing the browser to silently swallow the first tap ("ghost click prevention")
2. iOS/Android impose a 300ms tap delay on click events unless the element opts out
3. Long questions push the button below the fold, requiring the user to scroll before tapping

**Fixes applied:**
- Options rendered as `<button type="button">` — native keyboard focus/activation (Enter/Space) without extra `onKeyDown` handlers; also satisfies ARIA best practices
- `pointer-events-none` on the options container when `answered === true` — prevents any residual touch event on option D from propagating after the answer is registered
- `touch-action: manipulation` (Tailwind `touch-manipulation`) on both option buttons and the next button — eliminates the 300ms click delay
- `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` called with an 80 ms `setTimeout` in an `answered`-dependent `useEffect` — the delay lets React finish inserting the button into the DOM before the scroll fires; `block: 'nearest'` avoids unnecessary scrolling when the button is already visible
- `border-t border-gray-200 pt-5` separator above the next button — provides visual and spatial distance from option D to reduce mis-taps
- `pointer-events-none` on the next button itself for the first 350 ms after it appears (`nextReady` state, set to `true` via `setTimeout(..., 350)`) — ghost-click prevention in mobile browsers suppresses clicks within ~300 ms at the same screen coordinates as the preceding touch. When the page fits in the viewport and `scrollIntoView` does not move the button, the button would appear at the exact spot where the finger lifted; the 350 ms lock ensures the ghost-click window has passed before the button accepts input.

### SEO / AEO configuration

All SEO assets target `https://z111048.github.io/uav-license-quiz/` (GitHub Pages).

**`index.html`** contains:
- `<title>` and `<meta name="description/keywords">` — primary on-page signals
- `<link rel="canonical">` — prevents duplicate-content issues under different paths
- `<meta name="google-site-verification">` — Google Search Console ownership proof
- `<link rel="icon" href="/favicon.svg" type="image/svg+xml">` and `<link rel="apple-touch-icon">` — favicon for browser tab / iOS home screen; uses absolute paths (`/`) which Vite resolves correctly using the `base` config at build time.
- Open Graph (`og:`) and Twitter Card tags — correct preview when shared on Line / Facebook / Twitter; `og:image` and `twitter:image` point to `public/og-image.png` (1200×630px); `og:image:width/height/type` declared explicitly so platforms don't need a separate request; `twitter:card` is `summary_large_image`; `twitter:image:alt` set for accessibility
- `<meta name="theme-color">` and `<link rel="manifest">` — PWA integration
- JSON-LD `@type: WebApplication` — enables Google rich results; lists feature set, marks app as free, and includes `dateModified`
- JSON-LD `@type: FAQPage` — **AEO**: 6 Q&As in structured form so Google SGE / ChatGPT Search / Perplexity can cite answers directly from this site
- `<noscript>` block — fallback text content (h1, h2, ul) visible to crawlers that don't execute JavaScript (Bing, Baidu, etc.), ensuring the page is not seen as blank by non-JS bots
- The manifest href uses `/site.webmanifest`; Vite substitutes the correct base path at build time.

**`public/robots.txt`** — `Allow: /uav-license-quiz/` + `Sitemap:` directive pointing to the full sitemap URL.

**`public/sitemap.xml`** — single `<url>` entry for the root. Update `<lastmod>` whenever the question bank data is refreshed. Currently set to `2026-02-26`.

**`public/site.webmanifest`** — PWA manifest (name, short_name, description, theme/background color, scope). `icons` array references `icon-192.png` and `icon-512.png` for installable PWA support. Icon PNGs are generated by running `uv run --with Pillow python generate_icons.py` (or re-run the inline script used to create them originally).

**AEO strategy summary:**
- FAQPage JSON-LD is the primary AEO signal — AI engines extract Q&A pairs directly from schema
- noscript text reinforces content for non-JS bots, improving confidence in page content
- `public/og-image.png` (1200×630px) is set as `og:image` and `twitter:image` — improves social sharing CTR on Line / Facebook / Twitter/X
- `og:image:width/height/type` declared inline — platforms skip a round-trip HEAD request, reducing preview failure rate

**Favicon assets** (`favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`):
- SVG is the canonical source; designed in a 32×32 viewBox (blue rounded-rect background, white top-down quadcopter shape)
- PNG icons are generated programmatically via Pillow using the same proportions as the SVG; re-generate after any design change
- `dateModified` in WebApplication JSON-LD should be updated whenever content is significantly refreshed

### Image display in frontend

`public/data/professional_images.json` is fetched once when the professional bank is selected (`imageMap` state in `App.tsx`). The map is passed as an optional prop to `QuizView`, `ReadingView`, and `StudyView`; other banks receive `null` and render no images.

**Image sizing:** All three views use `w-full` so images fill the same width as the question text.

**Disclaimer:** Every image renders a caption beneath it: `圖片由 AI 產製，僅供參考，可能與實際情況有所差異` (`text-xs text-gray-400`).

**Per-view specifics:**
- `QuizView` — `aspect-square w-full` container prevents layout shift that would interrupt `scrollIntoView` after answering
- `ReadingView` — thumbnail with `cursor-zoom-in`; clicking opens a `fixed inset-0` lightbox (`lightboxSrc` state); lightbox closes on backdrop click or ✕ button
- `StudyView` — image is always visible inside `QuestionCard` (not inside the AI aid expand/collapse toggle)

**Global index lookup:** All three views compute `questions.indexOf(currentQ)` (0-based) to key into `imageMap`. This matches the key scheme in `professional_images.json` and `professional_study_aids.json`.

### generate_study_aids.py notes
- Uses **tool use** (`tool_choice: {type: "tool"}`) for structured output — no JSON parsing failures
- `CONCURRENCY = 3` to stay under the 10,000 output tokens/minute rate limit
- Resume support: skips questions whose index key already exists in the output JSON
- To retry failed (empty `{}`) entries: manually delete their keys from the JSON and re-run
