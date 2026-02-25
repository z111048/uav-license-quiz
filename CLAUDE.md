# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Frontend development:**
```bash
npm install        # 安裝依賴（首次或 package.json 變更後）
npm run dev        # 啟動開發伺服器（http://localhost:5173）
npm run build      # 建置靜態檔案到 dist/
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
│   ├── types.ts           # TypeScript type definitions + BANK_CONFIGS
│   ├── index.css          # Tailwind v4 import + custom styles
│   └── components/
│       ├── BankSelector.tsx   # Bank version tabs
│       ├── SetupView.tsx      # Chapter selection, settings
│       ├── QuizView.tsx       # Timed quiz (10s per question)
│       ├── ReadingView.tsx    # Browse all questions with answers
│       ├── WhitelistView.tsx  # Searchable whitelist
│       ├── AllAboveView.tsx   # "以上皆是" strategy analysis (runtime-computed, no JSON changes needed)
│       ├── StudyView.tsx      # AI study mode (keywords, mnemonic, explanation per question)
│       └── ResultView.tsx     # Score summary + wrong question review
├── public/
│   ├── robots.txt         # SEO: allow all crawlers, declare sitemap location
│   ├── sitemap.xml        # SEO: canonical URL for Google/Bing indexing
│   ├── site.webmanifest   # PWA manifest (name, short_name, theme_color)
│   └── data/              # JSON files served to the app (committed)
│       ├── general.json
│       ├── professional.json
│       ├── renewal.json
│       ├── renewal_basic.json
│       └── professional_study_aids.json  # AI study aids (optional, generate separately)
├── index.html             # SPA entry point; contains all SEO meta tags + JSON-LD
├── ref/                   # Reference files (PDFs are gitignored)
├── pyproject.toml         # uv Python environment
├── update_question_bank.py    # Auto-download and process all banks
├── generate_study_aids.py     # Batch-generate AI study aids via Claude Haiku API
└── # Legacy files (kept for backwards compatibility)
    ├── process_question_bank.py
    ├── question_bank.json
    └── process_question_bank.json
```

### Frontend stack
- **Vite + React + TypeScript** — build tooling
- **Tailwind CSS v4** — styling via `@tailwindcss/vite` plugin

### View management
`App.tsx` manages a `view: ViewType` state and conditionally renders one of seven components:
- `SetupView` — chapter selection, settings, entry points
- `QuizView` — timed question answering (10s per question)
- `ReadingView` — browse all questions with answers shown
- `WhitelistView` — searchable list of memorizable answer options
- `AllAboveView` — "以上皆是" strategy analysis (questions classified at runtime into "can memorize" vs "trap")
- `StudyView` — AI study mode: chapter stats, per-question expandable cards with keywords/mnemonic/explanation/wrong-option notes
- `ResultView` — score summary and wrong-question review

`BankSelector` appears above the setup/reading/whitelist/allabove/study views for switching between the 4 bank versions. Switching resets to setup view and triggers a new fetch.

### Data formats

`public/data/*.json` (app reads these):
```json
{
  "questions": [{ "id": 1, "question": "...", "options": {"A": "...", "B": "..."}, "answer": "A", "chapter": "...", "can_memorize_directly": true }],
  "answer_option_whitelist": ["唯一正確選項文字", ...]
}
```

The app also supports the legacy array format for backwards compatibility.

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
- `pointer-events-none` on the options container when `answered === true` — prevents any residual touch event on option D from propagating after the answer is registered
- `touch-action: manipulation` (Tailwind `touch-manipulation`) on both option divs and the next button — eliminates the 300ms click delay
- `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` called with an 80 ms `setTimeout` in an `answered`-dependent `useEffect` — the delay lets React finish inserting the button into the DOM before the scroll fires; `block: 'nearest'` avoids unnecessary scrolling when the button is already visible
- `border-t border-gray-200 pt-5` separator above the next button — provides visual and spatial distance from option D to reduce mis-taps

### SEO configuration

All SEO assets target `https://z111048.github.io/uav-license-quiz/` (GitHub Pages).

**`index.html`** contains:
- `<title>` and `<meta name="description/keywords">` — primary on-page signals
- `<link rel="canonical">` — prevents duplicate-content issues under different paths
- Open Graph (`og:`) and Twitter Card tags — correct preview when shared on Line / Facebook / Twitter
- `<meta name="theme-color">` and `<link rel="manifest">` — PWA integration
- JSON-LD structured data (`@type: WebApplication`) — enables Google rich results; lists feature set and marks the app as free
- The manifest href uses `%BASE_URL%site.webmanifest`; Vite substitutes `%BASE_URL%` at build time so the path resolves correctly under any deploy prefix (e.g. `/uav-license-quiz/`)

**`public/robots.txt`** — `Allow: /` + `Sitemap:` directive pointing to the full sitemap URL.

**`public/sitemap.xml`** — single `<url>` entry for the root. Update `<lastmod>` whenever the question bank data is refreshed.

**`public/site.webmanifest`** — minimal PWA manifest (name, short_name, description, theme/background color). No icons currently; add `icons` array if a favicon is introduced.

### generate_study_aids.py notes
- Uses **tool use** (`tool_choice: {type: "tool"}`) for structured output — no JSON parsing failures
- `CONCURRENCY = 3` to stay under the 10,000 output tokens/minute rate limit
- Resume support: skips questions whose index key already exists in the output JSON
- To retry failed (empty `{}`) entries: manually delete their keys from the JSON and re-run
