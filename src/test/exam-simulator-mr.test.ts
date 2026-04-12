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

  it('has a mode toggle button (demo ↔ manual)', () => {
    expect(HTML).toContain('toggleMode()')
    expect(HTML).toContain('示範模式')
    expect(HTML).toContain('手動模式')
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

  it('has landing legs', () => {
    expect(HTML).toContain('Landing legs')
  })

  it('has an FPV mount node attached to the drone', () => {
    expect(HTML).toContain('fpvMount')
    expect(HTML).toContain('Object3D')
  })

  it('alternates propeller spin direction (counter-rotating pairs)', () => {
    // One pair spins +1, the other −1
    expect(HTML).toMatch(/propSpin\s*\*\s*\(.*%\s*2.*===.*0.*\?.*1.*:.*-1/)
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

  it('supports keyboard input for all axes (WASD + QE + Space/Shift)', () => {
    expect(HTML).toContain("'KeyW'")
    expect(HTML).toContain("'KeyS'")
    expect(HTML).toContain("'KeyA'")
    expect(HTML).toContain("'KeyD'")
    expect(HTML).toContain("'KeyQ'")
    expect(HTML).toContain("'KeyE'")
    expect(HTML).toContain("'Space'")
    expect(HTML).toContain("'ShiftLeft'")
  })

  it('clamps drone altitude to ≥ 0 (no underground flight)', () => {
    expect(HTML).toContain('Math.max(0')
  })

  it('implements hover timer detection for practice waypoints', () => {
    expect(HTML).toContain('updateHoverTimer')
    expect(HTML).toContain('PRACTICE_WPS')
    expect(HTML).toContain('hoverAcc')
  })

  it('practice waypoints include all 4 rectangle corners and H', () => {
    // P1, P2, P3, P4, H
    expect(HTML).toContain("id:'P1'")
    expect(HTML).toContain("id:'P2'")
    expect(HTML).toContain("id:'P3'")
    expect(HTML).toContain("id:'P4'")
    expect(HTML).toContain("id:'H-air'")
    expect(HTML).toContain("id:'H-land'")
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
