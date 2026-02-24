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

**Legacy single-bank processing** (after manually editing `question_bank.json`):
```bash
python process_question_bank.py
```

## Architecture

### Data flow
```
CAA website PDF  →  update_question_bank.py  →  public/data/*.json  →  Vite React app
                     (uv Python script)           (4 versions)          (fetches on load)
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

**PDF page number artifact (known issue):**
- pdfplumber extracts page footer numbers as plain text lines; these can end up captured inside option D or question text (e.g. `'800 呎。5'` where `5` is a page number)
- The parser strips standalone digit-only lines (`re.sub(r"(?m)^\s*\d+\s*$\n?", "", ...)`) before regex matching to prevent this
- `professional.json` was the only affected bank; 97 tail-embedded and 4 mid-text occurrences were manually corrected in February 2026
- After any PDF re-parse, check for trailing digits after `。` / `？` in question and option texts

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
│       └── ResultView.tsx     # Score summary + wrong question review
├── public/
│   └── data/              # JSON files served to the app (committed)
│       ├── general.json
│       ├── professional.json
│       ├── renewal.json
│       └── renewal_basic.json
├── ref/                   # Reference files (PDFs are gitignored)
├── pyproject.toml         # uv Python environment
├── update_question_bank.py  # Auto-download and process all banks
└── # Legacy files (kept for backwards compatibility)
    ├── process_question_bank.py
    ├── question_bank.json
    └── process_question_bank.json
```

### Frontend stack
- **Vite + React + TypeScript** — build tooling
- **Tailwind CSS v4** — styling via `@tailwindcss/vite` plugin

### View management
`App.tsx` manages a `view: ViewType` state and conditionally renders one of five components:
- `SetupView` — chapter selection, settings, entry points
- `QuizView` — timed question answering (10s per question)
- `ReadingView` — browse all questions with answers shown
- `WhitelistView` — searchable list of memorizable answer options
- `ResultView` — score summary and wrong-question review

`BankSelector` appears above the setup/reading/whitelist views for switching between the 4 bank versions. Switching resets to setup view and triggers a new fetch.

### Data formats

`public/data/*.json` (app reads these):
```json
{
  "questions": [{ "id": 1, "question": "...", "options": {"A": "...", "B": "..."}, "answer": "A", "chapter": "...", "can_memorize_directly": true }],
  "answer_option_whitelist": ["唯一正確選項文字", ...]
}
```

The app also supports the legacy array format for backwards compatibility.
