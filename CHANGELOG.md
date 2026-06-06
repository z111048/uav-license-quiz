# Changelog

## 2026-06-06 (2)

- **Parser bug fix** — `update_question_bank.py` was silently dropping 35 questions from the professional bank (553 instead of 588).
  - Root cause: page footer digits appear on standalone lines at page boundaries. The operation order was wrong — double-newline normalisation (`\n(\d+.)` → `\n\n\1`) ran before page-number removal (`^\s*\d+\s*$`). The `\s*` in the page-number regex consumed the preceding `\n`, collapsing `\n2\n\n12.` → `\n12.`. The question-boundary lookahead `(?=\n\n\d+.)` then failed, causing Q12 to be absorbed into Q11's option-D text.
  - Fix: swap execution order — remove standalone page-number lines first, then insert double newlines before question numbers.
  - `public/data/professional.json` regenerated with correct 588 questions and updated whitelist (354 items).

## 2026-06-06

- **Design system established** — unified typography, colour tokens, icon library, and component utilities applied across the entire frontend.
  - **Typography**: Inter (Google Fonts, Latin/numerals only) loaded in `index.html`; `--font-sans` set in Tailwind v4 `@theme` with CJK fallback chain `PingFang TC → Noto Sans TC → Microsoft JhengHei`. `antialiased` added to root element.
  - **Colour tokens** (`src/index.css` `@theme`): 7 semantic groups each with 4 shades (base / dark / muted / subtle): `brand`, `success`, `danger`, `warn`, `teal`, `surface`, `border`. All exposed as Tailwind utility classes; raw colour literals removed from all components.
  - **Icon library**: `lucide-react` installed; replaced ad-hoc SVGs and emoji icons (`✕ ▶ ⚡ 🎯 🤖 🪁`) with `Play`, `BookOpen`, `Zap`, `Crosshair`, `Sparkles`, `HelpCircle`, `Cpu`, `ChevronRight`, `X`, `Search`, `CheckCircle2`, `AlertTriangle`, `Check`.
  - **Component utilities** (`@layer components`): `.page-card`, `.section-header`, `.btn-{primary|outline|ghost|success|warn|dark|teal}` + `.btn-{lg|md|sm}`, `.badge-{brand|success|danger|warn|teal|neutral}`, `.input`, `.select`, `.btn-close`, `.action-row`.
  - All 8 view components updated to consume the new tokens and icon system.
  - `SetupView`: chapter checkboxes redesigned as full-area labelled card rows; `練習題數`/`每題作答時間` in 2-column grid on md+; secondary links as `.action-row` pill rows.
  - `QuizView` / `ResultView` / `WhitelistView` / `AllAboveView` / `LicenseAdvisorView`: semantic tokens throughout, lucide icons for structural UI elements.

## 2026-05-16

- Improved multirotor practical simulator manual-mode feedback in `public/exam-simulator-mr.html`:
  - Added stick input visualization for yaw, throttle, forward/backward, and lateral movement.
  - Expanded HUD telemetry with horizontal speed, vertical speed, pitch, and roll.
  - Added ATTI/POS teaching callouts that explain drift vs GPS hold behavior.
  - Added wind direction indicator showing source direction and push direction.
  - Added landing safety hints for fast descent and excessive horizontal speed near the ground without changing motor stop or landing mechanics.
- Updated `src/test/exam-simulator-mr.test.ts` to cover the new simulator UI and preserve existing CSC, RTH, and bounded wind model behavior.
- Updated SEO/AEO metadata for the simulator improvements:
  - `index.html` descriptions, keywords, WebApplication `featureList`, `dateModified`, FAQPage answer, and `<noscript>` fallback.
  - `src/components/SetupView.tsx` visible FAQ simulator answer.
  - `public/sitemap.xml` `<lastmod>` set to `2026-05-16`.

## 2026-04-28

- ChatGPT image pipeline added alongside existing Gemini pipeline:
  - **`scripts/images/analyze_questions_claude.py`** — re-analyzes all 588 professional questions with Claude Sonnet to determine which truly need images (strict standard: "essential for understanding", not just "helpful"). Outputs `professional_image_analysis_v2.json` + `image_review.html` for human review. Replaced original Gemini analysis (`gemini-3-flash-preview`, tier 1/2/3 system, 63% selected) with a binary `need_image: true/false` decision (23.6% selected = 139 questions). Cost: ~$1.55 USD for 588 questions.
  - **`scripts/images/generate_images_chatgpt_batch.py`** — generates images via OpenAI gpt-image-2 using the Batch API (50% discount). Reads `professional_image_analysis_v2.json`. Parameters: `output_format: "png"` (not `response_format`—unsupported by gpt-image-2). Saves PNG to `public/data/images/professional_chatgpt/`. State file `.batch_state.json` stores `batch_id` for recovery if interrupted; `--collect` flag retrieves results from an already-submitted batch. Polls every 60 minutes. Cost: ~$3.68 USD for 139 images at medium quality.
  - **`scripts/images/generate_images_chatgpt.py`** — synchronous fallback (non-batch) using `AsyncOpenAI`; reads same v2 analysis; same style prefix as batch version.
  - **`scripts/images/convert_and_upload.py`** — added `--source gemini|chatgpt` flag; ChatGPT path reads from `public/data/images/professional_chatgpt/` and uploads to Firebase `professional_chatgpt/` prefix, writing `webp_urls_chatgpt.json`.
  - **`scripts/images/generate_image_manifest.py`** — added `--source gemini|chatgpt` flag; ChatGPT path writes `public/data/professional_images_chatgpt.json`.
  - **Image style**: ChatGPT images use flat/semi-flat 2D educational diagram style (vs Gemini's isometric 3D), white background, Traditional Chinese labels.
  - **Prerequisite**: gpt-image-2 requires OpenAI organization verification at https://platform.openai.com/settings/organization/general before use.
- `.env` now includes `OPENAI_API_KEY` (alongside existing `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, Firebase vars).

## 2026-04-25

- SEO & homepage optimisation:
  - `index.html` — `dateModified` updated to `2026-04-25`; WebApplication schema: added `audience` (`EducationalAudience / student`); new `HowTo` schema (4 steps: choose bank → filter chapters → timed practice → review wrongs) for Google SGE step display
  - `public/sitemap.xml` — `<lastmod>` updated to `2026-04-25`
  - `src/components/SetupView.tsx`:
    - Feature pill row added at the top of the card: 完全免費 / 無需登入 / AI 諧音記憶 / 術科 3D 模擬器 / 即時更新
    - 術科模擬器 promoted from a small text link to a standalone teal card with description and "進入模擬器 →" button
    - Collapsible `<details>` FAQ section added at the bottom (3 Q&As matching FAQPage JSON-LD content), so Google sees consistent visible text alongside the schema

## 2026-04-23

- SEO improvements to `index.html` to reflect both 學科 and 術科 content:
  - `meta description` updated to include 多旋翼機術科測驗 3D 飛行模擬器
  - `meta keywords` expanded with six 術科-related terms: `術科測驗`, `無人機術科`, `飛行測驗`, `術科模擬器`, `多旋翼機術科`, `無人機飛行測驗`
  - Open Graph `og:description` and Twitter `twitter:description` updated to match
  - JSON-LD WebApplication `featureList` — added: 術科測驗 3D 飛行模擬器（多旋翼機基本級）, RTH 自動返航模擬, ATTI / POS 飛行模式切換, 風場干擾模擬
  - JSON-LD `dateModified` updated to `2026-04-22`
  - FAQPage: added 7th Q&A — 「無人機術科測驗要考什麼？如何準備？」
  - `<noscript>` fallback: added `<h2>術科測驗準備</h2>` section listing simulator capabilities
- `public/sitemap.xml` — `<lastmod>` updated to `2026-04-22`

## 2026-04-22

- Updated 屆期換證 and 屆期換證（簡易）question banks to the 2026/04/07 CAA release (both 324 / 120 questions unchanged in count; edits were pure formatting — spaces removed around numbers in question text).
- `update_question_bank.py` improvements:
  - **`--banks` CLI argument**: `uv run update_question_bank.py --banks renewal renewal_basic` updates only the specified banks; omitting updates all four.
  - **SHA-256 hash comparison** replaces the old Content-Length check. `scrape_hash_links(url)` parses all `FileHashValue.aspx` links from the CAA page (same match/exclude/require logic as PDF links, applied to the URL-decoded `fn` parameter). `fetch_remote_sha256(hash_page_url)` fetches the hash page and extracts the SHA-256 for the `.pdf` row. `sha256_of_file(path)` computes the local file hash. If `local_sha256 == remote_sha256` and the JSON already records the same hash in `source_sha256`, the bank is skipped entirely (no download, no re-parse).
  - **`_roc_date_to_ad(fn_decoded)`**: extracts the ROC date (`【YYY.M.D更新】`) from the hash-link `fn` parameter and converts to `YYYY/MM/DD` (ROC year + 1911). Returns `None` if pattern not found.
  - **`scrape_hash_links` return type** changed from `dict[str, str]` to `dict[str, dict]` — each value is `{"url": ..., "updated": "YYYY/MM/DD" | None}`.
  - **`_merge_chapters(new_questions, old_json_path)`**: merges chapter classifications from the previous JSON into freshly parsed questions. Two-pass strategy: ① exact question-text match (safe for any bank); ② ID-based fallback when total count is unchanged (handles pure formatting changes like spacing). Added to BANK_CONFIGS entries for `renewal`/`renewal_basic` via `chapter_note` presence check.
  - Output JSON now includes `source_sha256` (SHA-256 of the downloaded PDF) and `source_updated` (date as `YYYY/MM/DD`).
- `src/types.ts` — `BankData` interface: added `source_updated?: string` and `source_sha256?: string`.
- `src/App.tsx` — passes `sourceUpdated={bankData.source_updated}` to `SetupView`.
- `src/components/SetupView.tsx` — header row now shows `共 N 題　題庫版本：YYYY/MM/DD` right-aligned in `text-xs text-gray-400` beside the `練習設定` heading. Prop: `sourceUpdated?: string`.

## 2026-04-14

- Added **自動返航 (RTH)**, **飛行模式 (ATTI/POS)**, and **風場干擾 (Wind Field)** to `public/exam-simulator-mr.html`:
  - **Wind field** (`computeWindVelocity`): physically correct drag-relative-to-wind model — velocity relaxes toward wind velocity `vel = vel * hDrag + windVel * (1 - hDrag)` instead of additive acceleration. FROM-direction convention: `windVelX = -sin(dir)*speed`, `windVelZ = cos(dir)*speed` (FROM north=0 pushes south=+Z). Turbulence is sum-of-sines (3 frequencies, zero-mean, amplitude ≤ `speed*0.85`). 💨 button (demo: `right:84px`, manual: `left:8px top:134px`) toggles a wind panel with speed slider (0–10 m/s), direction select (8 compass directions), and turbulence slider (0–1×).
  - **Flight modes** — `toggleFlightMode()` (F key or `#fmode-btn`) cycles `'ATTI'` ↔ `'POS'`:
    - **ATTI (姿態模式)**: standard tilt-based control; wind causes uncorrected drift
    - **POS (定位模式)**: GPS hold via PD controller (`GPS_KP=0.6`, `GPS_KD=0.25`). Sticks active (magnitude >0.08) → update `holdPosX/Z`; sticks neutral → apply correction `fwdCmd = clamp(GPS_KP*fwdErr - GPS_KD*fwdVel, -1, 1)`. Naturally opposes wind drift.
  - **RTH (返航)** — `toggleRTH()` (R key or `#rth-btn`):
    - Three-phase state machine: `'inactive' | 'climbing' | 'navigating' | 'descending'`
    - Climbing: altitude PD (`RTH_ALT_KP=1.5`, `RTH_ALT_KD=2.5`) climbs to `RTH_ALT=5m`, GPS-holds XZ
    - Navigating: fly toward home (0,0) with `RTH_HOR_KP=1.2`, `RTH_HOR_KD=0.5`; switch to descend when `dist < RTH_HOME_RADIUS=0.5m`
    - Descending: land, call `stopManualMotors('landed')` when `y≤0.05 && |velY|<0.1 && |velXZ|<0.25`
    - RTH cancelled on power-off (`startManualPowerOff`) and demo-mode switch (`finishDemoModeSwitch`, `toggleMode`)
  - New HUD lines in `#stat`: 飛行模式 (`#sFMode`), 風速 (`#sWindSpd`), RTH (`#sRth`).
  - New camera-bar buttons: `#fmode-btn` and `#rth-btn`.
  - `sinY/cosY` moved to top of `updateManual()` (was mid-function) so RTH and POS branches can use heading trig.
  - `windNoiseT` accumulates `dt` each frame for the turbulence time argument.
  - 25 new Vitest tests added in `src/test/exam-simulator-mr.test.ts` (sections 11 & 12): `computeWindVelocity` direction correctness (all 4 cardinal directions), turbulence boundedness, zero-mean turbulence; plus HTML structure checks for RTH/mode constants, buttons, HUD elements, and key bindings.

## 2026-04-13

- Added exam field ground markings to `public/exam-simulator-mr.html` per CAA spec (`ref/無人機場地細部尺寸.pdf`):
  - **Basic level (圖9)**: cyan double-frame around 12×5m P1–P4 rectangle (outer 14×7m, inner 10×3m); traffic cones at P1–P4 only (not at white boundary corners)
  - **Advanced level (圖10)**: yellow double-frame (outer 16×16m, inner 8×8m); red outer arcs r=8m each drawn only to vertical centreline x=0 (~277°); red inner rings r=4m centred at (±6,−6); removed A/B ground-circle markers
  - Traffic cone model improved: thinner white reflective bands (h=0.025m), wider body, square black base plate
  - Helpers added: `groundRingAt`, `groundArc`, `groundFillRect`, `groundFillDisc`
- `public/exam-simulator-mr.html` manual-mode interaction now more closely matches a DJI multirotor:
  - `modebtn` and `powerbtn` are separate. `modebtn` only switches demo/manual mode. `powerbtn` alone handles aircraft power with a DJI-style short-press-then-hold interaction.
  - Power-on no longer spins props. It only energizes the aircraft and nav lights; props stay stopped until a ground CSC gesture starts the motors.
  - Manual motor state is now separate from aircraft power (`motorState`: `'stopped' | 'starting' | 'running' | 'stopping'`).
  - Desktop CSC mappings for `handleManualCsc(...)` are:
    - inward: `S + D + ↓ + ←`
    - outward: `S + A + ↓ + →`
  - After landing, props stop only after sustained down-throttle on the ground; not immediately on touchdown.
  - Manual keyboard mapping now mirrors the left/right stick semantics:
    - left stick: `W/S` throttle, `A/D` yaw
    - right stick: arrow keys for planar movement
  - Mobile CSC detection now uses `CSC_AXIS_THRESHOLD = 0.55` instead of near-axis-max thresholds, because nipplejs touch diagonals are circular and do not reliably reach `0.92` on both axes.
  - HUD status line `#sCsc` exposes CSC readiness/debug state (`示範模式` / `未開機` / `請落地後操作` / `待命（下內八 / 下外八）` / `內八/外八偵測中 xx%` / `CSC 成立...`).
  - Keep `updateManual()` locked when powered but `motorState !== 'running'`; do not reintroduce yaw/lift movement before motors are started.
  - Visual prop spin was intentionally increased (`MAN.idleRotor = 0.30`, `propSpin += dt * 90 * Math.max(0, spinFactor)`) so startup and climb look believable.
  - Manual horizontal travel was intentionally sped up for mobile usability (`MAN.maxTilt = 0.42`, `MAN.drag = 1.8`, `MAN.tiltRate = 12`); preserve the faster forward/side response unless explicitly asked to retune it.
- Added drone sound synthesis to `public/exam-simulator-mr.html` using the Web Audio API (no external audio files):
  - Physical model: 4 motor oscillator banks (sawtooth + square + sine) detuned ±6–14 cents to create the characteristic inter-motor "beating"; blade-pass frequency (`HOVER_BPF = 275 Hz`) scales with `motorRpm` (38 Hz idle → 275 Hz hover); throttle input adds ≤22 Hz pitch shift; wind noise (bandpass white noise at 700 Hz) rises with horizontal speed.
  - Audio now starts **muted by default** (`audioMuted = true`, button text `🔇`) so the first tap on the audio button enables sound instead of accidentally muting the freshly-created context.
  - `unlockAudio()` is now `async`; on iOS/WebKit it retries `AudioContext.resume()` from real user gestures until the context reaches `running`, and uses a 1-sample silent warmup buffer for reliability.
  - HUD status line `#sAud` exposes audio state (`未啟用` / `已啟用` / `已啟用(靜音)` / `啟用失敗`) to debug mobile audio issues.
  - `updateAudio(motorRpm, speedMs, thrInput)` is called every animation frame; uses `setTargetAtTime` for smooth parameter glides, and now applies additional pitch drop during shutdown (`shutdownPitchDrop`) so power-off sounds like motor spin-down instead of simple fade-out.
  - `curThrInput` global captures throttle stick from `updateManual()` each frame; stays 0 in demo mode (smooth, constant hum).
  - 🔊/🔇 toggle button (`#audio-toggle`) sits beside `#hud-toggle` (right:46px top:8px in demo mode; stacks to left:8px top:92px in manual mode with 📋 📊).
  - `DynamicsCompressor` prevents clipping when all 4 banks are at full gain.
- Added explicit manual-mode power sequencing in `public/exam-simulator-mr.html`:
  - `powerState` state machine: `'off' | 'starting' | 'on' | 'stopping'`
  - `startManualPowerOn()` performs staged motor spool-up, callout text update, slight body wobble, and nav-light blink rhythm before controls become active.
  - `startManualPowerOff()` performs staged spool-down before returning to demo mode.
  - `updateManual()` now hard-locks control input unless `powerState === 'on'`.
  - Propellers now have separate visual inertia (`propVisualRpm`) plus `propBlurDiscs` so shutdown preserves visible spin/blur briefly after motor target drops.
- Navigation LEDs are now stateful:
  - `navLeds[]` stores front/rear LED references.
  - `updateNavLights()` drives front/rear blink rhythm during startup and fading flashes during shutdown by mutating `MeshStandardMaterial.emissiveIntensity`.
- iPhone / iPad orientation handling:
  - `scheduleOrientationReload()` forces `window.location.reload()` after orientation changes on iOS to recover from the occasional non-fullscreen WebKit viewport/layout bug.
  - Both `resize` and `orientationchange` listeners call this helper.
- Restored `public/exam-simulator.html` (fixed-wing/general simulator) which was accidentally deleted.
- Fixed TypeScript `TS1345` error in `src/test/exam-simulator.test.ts` by avoiding logical OR on `void` return types from assertions.
- Fixed overlapping left-side HUD panels in `public/exam-simulator-mr.html`: wrapped `#keyhint`, `#opcamctl`, `#stat` in a `#right-panels` flex-column container so they stack without overlap even when keyboard-hint is visible in manual mode.
- Added 術科測驗模擬器 entry link in `SetupView`: new `onSimulator` prop opens `exam-simulator-mr.html` in a new tab using `import.meta.env.BASE_URL`.
- Note: `public/exam-simulator-mr.html` (and `public/exam-simulator.html`) are standalone static HTML files — Vite copies them as-is to `dist/`, no compilation required.
- Mobile UI overhaul for `public/exam-simulator-mr.html`:
  - Default boot mode is now **demo** (auto-plays immediately, play bar visible on open).
  - 📋 top-left toggle: always-visible button to show/hide the 術科流程 steps panel; auto-expands in demo mode, auto-collapses in manual mode.
  - 📊 top-right toggle (demo mode): show/hide HUD panels (`#keyhint`, `#opcamctl`, `#stat`); hidden by default.
  - In **manual mode**: 📊 button moves to left side (`left:8px top:50px`), stacking below 📋; each button independently controls its own panel. Returns to `right:8px top:8px` on demo re-entry.
  - `#right-panels` repositioned to `right:8px; top:50px` (was left-anchored relative to steps panel).
  - Steps panel now highlights the current demo step in real time (fixed: `updateStepPanel()` now called from `updateCallout()` on every animation frame).
  - Removed centre-screen hover timer (`#htimer`, P1 XX s / 5 s block) and associated `PRACTICE_WPS`/`hoverAcc` logic.
  - Playback bar (`#ply`) and camera bar (`#cams`) gap increased (`#ply` bottom: 52px → 76px desktop, 58px mobile).
  - Fixed touch-drag text selection on joystick zones: added `user-select:none; -webkit-user-select:none` to `body`.
  - Camera buttons use `flex-wrap:wrap` + `max-width:92vw` to prevent overflow on small screens.
  - Manual mode joystick sensitivity reduced significantly: `moveSpd 4→1.8`, `yawSpd PI×0.9→PI×0.45`, `throttle 2.5→1.2`.
- Drone model completely redesigned (DJI Phantom-style) in `exam-simulator-mr.html`:
  - Octagonal body with glass dome, FPV camera, gimbal pod, tapered arms, motor stator/bell caps, 3-segment propeller blades, nav LEDs (red front-left, green front-right, white rear), dual-rail landing gear.
  - `GEAR_H = 0.162`: droneGroup Y offset so skids sit on ground at `dronePos.y = 0`.
  - `droneGroup.rotation.order = 'YXZ'`: yaw first, then pitch/roll for correct heading-relative tilt.
  - Propeller rotation direction fixed to DJI standard: SW(i=0)+NE(i=2) = CW (`-1`), NW(i=1)+SE(i=3) = CCW (`+1`). Formula: `(i%2===0 ? -1:1)`.
  - All child meshes set `castShadow=true` via `droneGroup.traverse()` for Three.js shadowmap.
  - Blob shadow (`_blobGrp`) removed — real Three.js sun shadow is sufficient.
  - `hPad.receiveShadow = true` is required so the aircraft shadow does not visually disappear over the H pad.
  - The H pad includes a geometric `H` marking built from flat planes; keep it as local geometry instead of introducing font loading or external assets.
- Motor spin-up/down animation: `motorRpm` lerps toward `motorTarget`; manual mode entry shows "🔴 開機中…" callout until `motorRpm >= 0.98`.
- Physics-based manual mode: stick → target pitch/roll angle (`MAN.maxTilt = 0.32 rad`) → horizontal acceleration via `acc = tilt × gravity` → velocity with `MAN.drag = 2.6` air resistance → position. Vertical has inertia (`manVelY`).
- Joystick lazy-init fix: `initJoysticks()` no longer called at boot (zones are `display:none`); called inside `toggleMode()` after zones are shown, ensuring nipplejs gets correct bounding box.
- Inspector (`inspMesh`, yellow person) set `visible = false` when entering manual mode.
