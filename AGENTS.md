# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the Vite + React + TypeScript app. Keep shared state in `src/App.tsx`, reusable types in `src/types.ts`, helpers in `src/utils.ts`, and screen components in `src/components/`. Put frontend tests in `src/test/`. Static assets live in `public/`; versioned question banks and AI-generated manifests are under `public/data/`. Python maintenance scripts sit at the repo root (`update_question_bank.py`, `generate_study_aids.py`) and in `scripts/images/` for image-analysis and upload workflows.

## Build, Test, and Development Commands
Run `npm install` once, then `npm run dev` to start the local app on port `5173`. Use `npm run build` to type-check and create the production bundle in `dist/`. Run `npm test` for a single Vitest pass and `npm run test:watch` during active frontend work. For data refreshes, use `uv run update_question_bank.py` to download and rebuild `public/data/*.json` (add `--banks <id>...` to update only specific banks, e.g. `--banks renewal renewal_basic`). The script compares SHA-256 from the CAA `FileHashValue.aspx` page and skips unchanged banks automatically. AI content scripts also run through `uv`, for example `uv run generate_study_aids.py`.

## Coding Style & Naming Conventions
Follow the existing TypeScript style: 2-space indentation, semicolon-free statements, single quotes, and functional React components. Name components in `PascalCase` (`QuizView.tsx`), functions and variables in `camelCase`, and keep constants in `UPPER_SNAKE_CASE` only when they are true globals. No ESLint or Prettier config is checked in, so match surrounding code closely and keep diffs small.

## Testing Guidelines
This project uses `Vitest` with `@testing-library/react` and `jsdom` (`src/test/setup.ts`). Add tests beside the existing suite in `src/test/`, using `*.test.ts` for utilities and `*.test.tsx` for component behavior. Cover user-visible flows: rendering, selection, callbacks, and bank-data normalization. Run `npm test` before opening a PR.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit prefixes such as `feat:`, `fix:`, and `refactor:`. Keep commit subjects short, imperative, and scoped to one change. PRs should explain user-facing impact, call out any regenerated data files in `public/data/`, link related issues, and include screenshots or short recordings for UI changes. If a change affects deployment behavior, note any `VITE_BASE` or GitHub Pages implications.

## Static HTML Simulators
`public/exam-simulator.html` and `public/exam-simulator-mr.html` are standalone static HTML files (Three.js + nipplejs via CDN). Vite copies them verbatim into `dist/` — **no compilation needed**. The React app links to `exam-simulator-mr.html` via `SetupView`'s `onSimulator` prop, using `import.meta.env.BASE_URL` to resolve the correct path on GitHub Pages. When editing either simulator, use vanilla CSS/JS only; do not import npm modules.

For `public/exam-simulator-mr.html`, preserve these simulator-specific behaviors unless the task explicitly changes them:
- iPhone / iPad compatibility matters. Audio starts muted by default and must be unlocked from a real user gesture through the existing Web Audio flow (`unlockAudio()`, `toggleAudio()`, HUD status `#sAud`). Do not reintroduce autoplay-style initialization.
- On iOS, orientation changes intentionally trigger a page reload (`scheduleOrientationReload()`) to recover from WebKit viewport bugs where the simulator sometimes fails to fill the screen after rotating to landscape.
- Manual mode now separates `mode` switching, aircraft power, and motor/prop state. Keep these behaviors coherent unless the task explicitly changes them:
  - `modebtn` only switches between demo and manual mode.
  - `powerbtn` alone handles DJI-style power interaction: short press once, then press and hold to power on/off.
  - Power-on only energizes the aircraft and nav lights. It must not start prop rotation by itself.
  - Props start only after a ground CSC gesture (`handleManualCsc`) and stop after landing with sustained down throttle, or an explicit ground CSC stop.
  - Manual flight input must stay locked while powered but motors are not running.
- Mobile CSC handling has been tuned for nipplejs touch input. Preserve the lower diagonal threshold (`CSC_AXIS_THRESHOLD = 0.55`) and the HUD debug line `#sCsc` unless the task explicitly changes mobile startup behavior.
- Manual horizontal movement has already been retuned to feel faster on phones (`MAN.maxTilt = 0.42`, `MAN.drag = 1.8`, `MAN.tiltRate = 12`). Avoid silently reverting these values.
- The H landing pad is expected to both receive shadows (`hPad.receiveShadow = true`) and show a visible geometric `H` marking.
- **Wind field** uses a drag-relative-to-wind model: `vel = vel * hDrag + windVel * (1 - hDrag)`. Do NOT change to additive `vel += wind * dt` — that model is unbounded. FROM-direction convention: `windVelX = -sin(dir)*speed`, `windVelZ = cos(dir)*speed`.
- **RTH** (`rthState`: `'inactive'|'climbing'|'navigating'|'descending'`) overrides all stick inputs inside `updateManual`. It must be cancelled on `startManualPowerOff` and `finishDemoModeSwitch`. Landing detection checks `y≤0.05 && |velY|<0.1 && |velXZ|<0.25` before calling `stopManualMotors`.
- **POS mode** GPS hold uses a PD controller (`GPS_KP=0.6`, `GPS_KD=0.25`); `holdPosX/Z` is updated while sticks are active (magnitude >0.08) and frozen when sticks are neutral. Do not apply POS correction while RTH is active.
- `sinY/cosY` (heading trig) is computed at the top of `updateManual()` and reused by all branches (RTH, POS hold, tilt physics). Do not move it back to mid-function.
- If you change simulator behavior, update the static simulator tests in `src/test/exam-simulator-mr.test.ts` as part of the same change.

## Security & Configuration Tips
Never commit `.env`, Firebase credentials, downloaded PDFs in `ref/*.pdf`, or generated image artifacts ignored by `.gitignore`. Treat files in `public/data/` as build inputs: regenerate them intentionally and review diffs before committing.
