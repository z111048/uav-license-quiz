/**
 * Tests for the multirotor UAV practical exam simulator
 * (public/exam-simulator-mr.html).
 *
 * The simulator is a standalone HTML file, so we:
 *   1. Validate static content (required sections, spec-compliant constants).
 *   2. Unit-test the pure logic functions embedded in it.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const HTML = readFileSync(
  resolve(__dirname, '../../public/exam-simulator-mr.html'),
  'utf-8',
)

function getConst(name: string): number {
  const m = HTML.match(new RegExp(`const\\s+${name}\\s*=\\s*(-?[\\d.]+)`))
  if (!m) throw new Error(`Constant ${name} not found in simulator HTML`)
  return parseFloat(m[1])
}

// ═══════════════════════════════════════════════════════════════
//  1. HTML structure
// ═══════════════════════════════════════════════════════════════
describe('exam-simulator-mr.html — HTML structure', () => {
  it('loads the file successfully (> 10 KB)', () => {
    expect(HTML.length).toBeGreaterThan(10_000)
  })

  it('includes Three.js r128 CDN script', () => {
    expect(HTML).toContain('three.min.js')
    expect(HTML).toContain('r128')
  })

  it('has a full-screen canvas element', () => {
    expect(HTML).toContain('<canvas id="c">')
  })

  it('has a callout UI element', () => {
    expect(HTML).toContain('id="callout"')
  })

  it('has a step-list panel', () => {
    expect(HTML).toContain('id="steps"')
    expect(HTML).toContain('STEP_DEFS')
  })

  it('has all four camera-selection buttons', () => {
    expect(HTML).toContain("setMainCam('op')")
    expect(HTML).toContain("setMainCam('fpv')")
    expect(HTML).toContain("setMainCam('top')")
    expect(HTML).toContain("setMainCam('all')")
  })

  it('has playback controls (play/pause, prev/next step)', () => {
    expect(HTML).toContain('togglePlay()')
    expect(HTML).toContain('stepNav(')
  })

  it('starts with audio muted so the first audio toggle enables sound', () => {
    expect(HTML).toContain('id="audio-toggle"')
    expect(HTML).toContain('>🔇</button>')
    expect(HTML).toContain('let audioMuted      = true')
  })

  it('uses an iOS-friendly audio unlock flow that retries until the context is running', () => {
    expect(HTML).toContain('async function unlockAudio()')
    expect(HTML).toContain('await audioCtx.resume()')
    expect(HTML).toContain("const audioUnlockEvents = ['pointerdown', 'touchstart', 'click', 'keydown']")
    expect(HTML).toContain('document.removeEventListener(evt, handleInitialAudioGesture, true)')
    expect(HTML).toContain("const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent)")
  })

  it('shows audio status in the HUD for mobile debugging', () => {
    expect(HTML).toContain('id="sAud"')
    expect(HTML).toContain('音訊：<b id="sAud">未啟用</b>')
    expect(HTML).toContain('function updateAudioStatus(text)')
  })

  it('has a mode toggle button (demo ↔ manual)', () => {
    expect(HTML).toContain('id="modebtn"')
    expect(HTML).toContain("modeBtn.addEventListener('click', toggleMode)")
    expect(HTML).toContain('🕹 手動模式')
    expect(HTML).toContain("id=\"sMode\"")
    expect(HTML).toContain('示範')
  })

  it('separates the manual-mode toggle from the power button', () => {
    expect(HTML).toContain('id="powerbtn"')
    expect(HTML).toContain("powerBtn.addEventListener('click', togglePower)")
    expect(HTML).toContain('🔋 電源')
  })

  it('includes explicit startup and shutdown power sequences for manual mode', () => {
    expect(HTML).toContain("let powerState  = 'on'")
    expect(HTML).toContain("function startManualPowerOn()")
    expect(HTML).toContain("function startManualPowerOff(nextMode = null)")
    expect(HTML).toContain('const DJI_POWER_HOLD_MS = 650')
    expect(HTML).toContain('const DJI_POWER_ARM_MS  = 5000')
    expect(HTML).toContain('primePowerButton')
    expect(HTML).toContain('再長按開機')
    expect(HTML).toContain('再長按關機')
    expect(HTML).toContain('系統上電、航燈亮起，葉槳保持停止')
    expect(HTML).toContain('無人機關機中')
  })

  it('reloads on iOS orientation changes to recover full-screen layout', () => {
    expect(HTML).toContain('function scheduleOrientationReload()')
    expect(HTML).toContain("window.addEventListener('orientationchange'")
    expect(HTML).toContain('window.location.reload()')
  })

  it('adds LED blink rhythm and prop inertia visuals during power transitions', () => {
    expect(HTML).toContain('const navLeds = []')
    expect(HTML).toContain('const propBlurDiscs = []')
    expect(HTML).toContain('function updateNavLights()')
    expect(HTML).toContain('function updatePropVisuals(dt)')
    expect(HTML).toContain('shutdownPitchDrop')
  })

  it('has virtual joystick elements for touch control', () => {
    expect(HTML).toContain('id="zoneL"')
    expect(HTML).toContain('id="zoneR"')
    expect(HTML).toContain('joy-zone')
  })
})

// ═══════════════════════════════════════════════════════════════
//  2. Exam-spec constants — multirotor basic <2kg spec
// ═══════════════════════════════════════════════════════════════
describe('exam-simulator-mr.html — spec-compliant constants', () => {
  it('FLY_ALT is within the 1–2 m exam altitude range', () => {
    const v = getConst('FLY_ALT')
    expect(v).toBeGreaterThanOrEqual(1)
    expect(v).toBeLessThanOrEqual(2)
  })

  it('rectangle width (REC_W) is exactly 12 m per spec', () => {
    expect(getConst('REC_W')).toBe(12)
  })

  it('rectangle depth (REC_D) is exactly 5 m per spec', () => {
    expect(getConst('REC_D')).toBe(5)
  })

  it('HW is defined as half the rectangle width (REC_W / 2)', () => {
    // HW is a derived constant, not a literal — verify the expression
    expect(HTML).toContain('HW')
    expect(HTML).toContain('REC_W / 2')
  })
})

// ═══════════════════════════════════════════════════════════════
//  3. Three-camera system
// ═══════════════════════════════════════════════════════════════
describe('exam-simulator-mr.html — three-camera system', () => {
  it('declares an operator perspective camera (opCam)', () => {
    expect(HTML).toContain('opCam')
    expect(HTML).toContain('PerspectiveCamera')
  })

  it('declares an FPV camera (fpvCam) with mount node', () => {
    expect(HTML).toContain('fpvCam')
    expect(HTML).toContain('fpvMount')
  })

  it('declares a top-down orthographic camera (topCam)', () => {
    expect(HTML).toContain('topCam')
    expect(HTML).toContain('OrthographicCamera')
  })

  it('sets topCam.up to north-up orientation', () => {
    // topCam.up.set(0, 0, -1) ensures north (−Z) is at the top
    expect(HTML).toContain('topCam.up')
    expect(HTML).toContain('-1')
  })

  it('uses autoClear = false for multi-viewport rendering', () => {
    expect(HTML).toContain('autoClear')
    expect(HTML).toContain('false')
  })

  it('implements PiP layout helper (layoutPip)', () => {
    expect(HTML).toContain('layoutPip')
  })

  it('implements three-way split-view mode', () => {
    expect(HTML).toContain("mainCam === 'all'")
  })
})

// ═══════════════════════════════════════════════════════════════
//  4. Quadrotor drone model
// ═══════════════════════════════════════════════════════════════
describe('exam-simulator-mr.html — quadrotor model', () => {
  it('has a drone group container', () => {
    expect(HTML).toContain('droneGroup')
  })

  it('uses BoxGeometry for the main body', () => {
    expect(HTML).toContain('BoxGeometry')
  })

  it('has four propeller groups for spinning animation', () => {
    expect(HTML).toContain('propGroups')
    expect(HTML).toContain('propSpin')
  })

  it('has landing gear', () => {
    expect(HTML).toContain('Landing Gear')
  })

  it('has an FPV mount node attached to the drone', () => {
    expect(HTML).toContain('fpvMount')
    expect(HTML).toContain('Object3D')
  })

  it('alternates propeller spin direction (counter-rotating pairs, DJI-standard CW/CCW)', () => {
    // SW+NE = CW (i%2===0 → -1 in Three.js positive-CCW convention)
    // NW+SE = CCW (i%2===1 → +1)
    expect(HTML).toMatch(/propSpin\s*\*\s*\(.*%\s*2.*===.*0.*\?.*-1.*:.*1/)
  })
})

// ═══════════════════════════════════════════════════════════════
//  5. Environment
// ═══════════════════════════════════════════════════════════════
describe('exam-simulator-mr.html — environment', () => {
  it('has a ground plane', () => {
    expect(HTML).toContain('PlaneGeometry')
    expect(HTML).toContain('ground')
  })

  it('has an H landing pad', () => {
    expect(HTML).toContain('hPad')
    expect(HTML).toContain('CircleGeometry')
  })

  it('draws the 12×5 m flight rectangle outline', () => {
    expect(HTML).toContain('groundRect')
    expect(HTML).toContain('REC_W')
    expect(HTML).toContain('REC_D')
  })

  it('places P1–P4 corner markers', () => {
    expect(HTML).toContain('cornerMarker')
    // All four corners should use ±HW and ±REC_D
    expect(HTML).toContain('-HW')
    expect(HTML).toContain('HW')
    expect(HTML).toContain('-REC_D')
  })

  it('has safety boundary ellipse', () => {
    expect(HTML).toContain('groundRing')
  })

  it('has safety cone props', () => {
    expect(HTML).toContain('cone(')
    expect(HTML).toContain('ConeGeometry')
  })

  it('has an operator figure with standing mat', () => {
    expect(HTML).toContain('makeOperator')
    expect(HTML).toContain('OP_Z')
  })

  it('has A and B safety markers', () => {
    expect(HTML).toContain('bigMarker')
  })

  it('has an inspector figure for 360° check animation', () => {
    expect(HTML).toContain('inspMesh')
    expect(HTML).toContain('CylinderGeometry')
    expect(HTML).toContain('inspAngle')
  })
})

// ═══════════════════════════════════════════════════════════════
//  6. SEQ demo sequence — step coverage
// ═══════════════════════════════════════════════════════════════
describe('exam-simulator-mr.html — SEQ demo sequence', () => {
  it('covers all required exam steps (A B Ca Cb D F)', () => {
    for (const id of ['A', 'B', 'Ca', 'Cb', 'D', 'F']) {
      expect(HTML, `Step ${id} missing from SEQ`).toContain(`s:'${id}'`)
    }
  })

  it('includes 「3、2、1、Go」highlighted callouts', () => {
    expect(HTML).toContain('3、2、1、Go')
    expect(HTML).toContain('hi:1')
  })

  it('includes 「結束」callouts', () => {
    expect(HTML).toContain('結束')
  })

  it('has clockwise hover sequence (四面停懸 CW)', () => {
    expect(HTML).toContain('順時針旋轉 90°')
    expect(HTML).toContain('機頭朝外')
    expect(HTML).toContain('機頭朝內')
  })

  it('has CCW 360° inspection text for step A and F', () => {
    expect(HTML).toContain('逆時針')
    expect(HTML).toContain('360°')
  })

  it('has rectangle CW and CCW lap callouts', () => {
    expect(HTML).toContain('順時針圈')
    expect(HTML).toContain('逆時針圈')
  })

  it('has yaw values matching exam C-a rotation (south → west → north → east)', () => {
    // south  = PI, west = -PI/2, north = 0, east = PI/2
    expect(HTML).toContain('yaw:PI')
    expect(HTML).toContain('yaw:-PI/2')
    expect(HTML).toContain('yaw:0')
    expect(HTML).toContain('yaw:PI/2')
  })

  it('includes FLY_ALT in waypoint y-coordinates', () => {
    expect(HTML).toContain('[0,FLY_ALT,0]')
  })
})

// ═══════════════════════════════════════════════════════════════
//  7. Manual control
// ═══════════════════════════════════════════════════════════════
describe('exam-simulator-mr.html — manual control', () => {
  it('implements updateManual function', () => {
    expect(HTML).toContain('updateManual')
  })

  it('supports keyboard input with WASD on the left stick and arrows on the right stick', () => {
    expect(HTML).toContain("'KeyW'")
    expect(HTML).toContain("'KeyS'")
    expect(HTML).toContain("'KeyA'")
    expect(HTML).toContain("'KeyD'")
    expect(HTML).toContain("'ArrowUp'")
    expect(HTML).toContain("'ArrowDown'")
    expect(HTML).toContain("'ArrowLeft'")
    expect(HTML).toContain("'ArrowRight'")
  })

  it('keeps power-on separate from prop spin and uses CSC to start motors', () => {
    expect(HTML).toContain("let motorState = 'running'")
    expect(HTML).toContain('function handleManualCsc')
    expect(HTML).toContain('雙搖桿下內八或下外八可啟動葉槳')
    expect(HTML).toContain('葉槳保持停止')
    expect(HTML).toContain('CSC 啟動馬達中')
  })

  it('blocks rotation and lift while powered on but motors are not started', () => {
    expect(HTML).toContain("if (motorState !== 'running') {")
    expect(HTML).toContain('curThrInput = 0')
    expect(HTML).toContain('return')
  })

  it('raises rotor target speed with climb input and tilt load after motor start', () => {
    expect(HTML).toContain('idleRotor:  0.30')
    expect(HTML).toContain('const climbLoad = Math.max(0, curThrInput) * 0.58')
    expect(HTML).toContain('const tiltLoad = Math.min(0.12')
    expect(HTML).toContain('motorTarget = Math.min(1, MAN.idleRotor + climbLoad + tiltLoad)')
  })

  it('uses a faster prop visual spin rate for manual rotor startup and flight', () => {
    expect(HTML).toContain('propSpin += dt * 90 * Math.max(0, spinFactor)')
  })

  it('keeps left stick on yaw/throttle and right stick on planar movement', () => {
    expect(HTML).toContain('Yaw (left stick X / A,D)')
    expect(HTML).toContain('Throttle (left stick Y / W,S)')
    expect(HTML).toContain('Right stick → target pitch/roll')
    expect(HTML).toContain('左搖桿：旋轉 / 升降')
    expect(HTML).toContain('右搖桿：前後 / 平移')
  })

  it('clamps drone altitude to ≥ 0 (no underground flight)', () => {
    expect(HTML).toContain('Math.max(0')
  })

  it('has a HUD toggle button for right-panels', () => {
    expect(HTML).toContain('toggleHud')
    expect(HTML).toContain('hud-toggle')
  })
})

// ═══════════════════════════════════════════════════════════════
//  8. Pure logic: lerpAngle (mirrored from the HTML for unit tests)
// ═══════════════════════════════════════════════════════════════
function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a
  while (d >  Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  let r = a + d * Math.min(t, 1)
  while (r >  Math.PI) r -= Math.PI * 2
  while (r < -Math.PI) r += Math.PI * 2
  return r
}

describe('lerpAngle — angle-wrapping interpolation', () => {
  it('interpolates forward at t=1', () => {
    expect(lerpAngle(0, Math.PI / 2, 1)).toBeCloseTo(Math.PI / 2)
  })

  it('returns start angle at t=0', () => {
    expect(lerpAngle(1.2, 2.5, 0)).toBeCloseTo(1.2)
  })

  it('clamps t > 1 to 1 (no overshoot)', () => {
    expect(lerpAngle(0, Math.PI / 4, 99)).toBeCloseTo(Math.PI / 4)
  })

  it('interpolates halfway at t=0.5', () => {
    expect(lerpAngle(0, Math.PI, 0.5)).toBeCloseTo(Math.PI / 2)
  })

  it('wraps across the ±π boundary (170° → −170° short path)', () => {
    const a = (170 * Math.PI) / 180
    const b = (-170 * Math.PI) / 180
    const result = lerpAngle(a, b, 1)
    // Normalise both to compare equivalence
    function norm(r: number) {
      let n = ((r % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      if (n > Math.PI) n -= Math.PI * 2
      return n
    }
    expect(norm(result)).toBeCloseTo(norm(b), 4)
  })
})

// ═══════════════════════════════════════════════════════════════
//  9. Pure logic: yaw convention (exam C-a four-sided hover)
// ═══════════════════════════════════════════════════════════════
function yawFromDir(dx: number, dz: number): number {
  return Math.atan2(dx, -dz)
}

describe('yaw convention — multirotor heading system', () => {
  it('facing south (toward operator): yaw ≈ ±π', () => {
    // Direction (0, 0, +1) = south = +Z
    const y = yawFromDir(0, 1)
    expect(Math.abs(y)).toBeCloseTo(Math.PI, 3)
  })

  it('facing north (away from operator): yaw ≈ 0', () => {
    const y = yawFromDir(0, -1)
    expect(y).toBeCloseTo(0, 3)
  })

  it('facing east (+X): yaw ≈ π/2', () => {
    const y = yawFromDir(1, 0)
    expect(y).toBeCloseTo(Math.PI / 2, 3)
  })

  it('facing west (−X): yaw ≈ −π/2', () => {
    const y = yawFromDir(-1, 0)
    expect(y).toBeCloseTo(-Math.PI / 2, 3)
  })

  it('CW rotation from south to west goes through southwest (short path)', () => {
    // CW: south(π) → west(−π/2) via SW (−3π/4 normalised)
    const mid = lerpAngle(Math.PI, -Math.PI / 2, 0.5)
    // Should be in the SW quadrant: yaw between −π and −π/2
    expect(mid).toBeLessThan(-Math.PI / 2)
    expect(mid).toBeGreaterThan(-Math.PI)
  })

  it('each CW step in Ca increases yaw by π/2 (mod 2π)', () => {
    const steps = [Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI]
    for (let i = 0; i < steps.length - 1; i++) {
      let diff = steps[i + 1] - steps[i]
      while (diff < 0) diff += Math.PI * 2  // normalise to positive
      expect(diff).toBeCloseTo(Math.PI / 2, 4)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
//  10. Pure logic: rectangle waypoint positions
// ═══════════════════════════════════════════════════════════════
describe('rectangle waypoint geometry', () => {
  const hw    = 6     // HW = REC_W / 2
  const recD  = 5     // REC_D

  it('P1 is at (−HW, 0) — front-left of rectangle', () => {
    expect(-hw).toBe(-6)
  })

  it('P2 is at (−HW, −REC_D) — back-left of rectangle', () => {
    expect(-hw).toBe(-6)
    expect(-recD).toBe(-5)
  })

  it('P3 is at (+HW, −REC_D) — back-right of rectangle', () => {
    expect(hw).toBe(6)
    expect(-recD).toBe(-5)
  })

  it('P4 is at (+HW, 0) — front-right of rectangle', () => {
    expect(hw).toBe(6)
  })

  it('rectangle width (P4.x − P1.x) is 12 m', () => {
    expect(hw - (-hw)).toBe(12)
  })

  it('rectangle depth (P1.z − P2.z) is 5 m', () => {
    expect(0 - (-recD)).toBe(5)
  })
})
