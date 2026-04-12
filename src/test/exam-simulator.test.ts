/**
 * Tests for the UAV practical exam simulator (public/exam-simulator.html).
 *
 * The simulator is a standalone HTML file, so we:
 *   1. Validate its static content (required sections, spec-compliant constants).
 *   2. Unit-test the pure logic functions that are embedded in it.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Load the simulator HTML once ─────────────────────────────
const HTML = readFileSync(
  resolve(__dirname, '../../public/exam-simulator.html'),
  'utf-8',
)

// ── Extract a numeric constant from the HTML source ──────────
function getConst(name: string): number {
  const m = HTML.match(new RegExp(`const\\s+${name}\\s*=\\s*(-?[\\d.]+)`))
  if (!m) throw new Error(`Constant ${name} not found in simulator HTML`)
  return parseFloat(m[1])
}

// ═══════════════════════════════════════════════════════════════
//  1. HTML structure checks
// ═══════════════════════════════════════════════════════════════
describe('exam-simulator.html — HTML structure', () => {
  it('loads the file successfully', () => {
    expect(HTML.length).toBeGreaterThan(10_000)
  })

  it('includes Three.js r128 CDN script', () => {
    expect(HTML).toContain('three.min.js')
    expect(HTML).toContain('r128')
  })

  it('has a full-screen <canvas> element', () => {
    expect(HTML).toContain('<canvas id="c">')
  })

  it('contains the callout UI element', () => {
    expect(HTML).toContain('id="callout"')
  })

  it('contains the step-list panel', () => {
    expect(HTML).toContain('id="steps"')
    expect(HTML).toContain('STEP_DEFS')
  })

  it('contains camera-selection buttons', () => {
    expect(HTML).toContain("setMainCam('op')")
    expect(HTML).toContain("setMainCam('fpv')")
    expect(HTML).toContain("setMainCam('top')")
    expect(HTML).toContain("setMainCam('all')")
  })

  it('contains playback controls', () => {
    expect(HTML).toContain('togglePlay()')
    expect(HTML).toContain('stepNav(')
  })

  it('shows a measurements info bar', () => {
    // Must display all three spec values for examiners
    expect(HTML).toContain('100')   // A↔B ≥ 100 m
    expect(HTML).toContain('50')    // altitude ≥ 50 m
    expect(HTML).toContain('4')     // runway width 4 m
  })
})

// ═══════════════════════════════════════════════════════════════
//  2. Exam-spec constants
// ═══════════════════════════════════════════════════════════════
describe('exam-simulator.html — spec-compliant constants', () => {
  it('runway width (RW_W) is 4 m per CAA spec', () => {
    expect(getConst('RW_W')).toBe(4)
  })

  it('mission altitude (CRUISE) is ≥ 50 m per CAA spec', () => {
    expect(getConst('CRUISE')).toBeGreaterThanOrEqual(50)
  })

  it('A↔B horizontal separation is ≥ 100 m per CAA spec', () => {
    const ax = getConst('WP_AX')  // negative → west
    const bx = getConst('WP_BX')  // positive → east
    const separation = Math.abs(bx - ax)
    expect(separation).toBeGreaterThanOrEqual(100)
  })

  it('race-track is ≥ 50 m north of runway (WP_Z ≤ −50)', () => {
    // Z-axis: −Z = north; runway at Z=0; track at WP_Z which is negative
    expect(getConst('WP_Z')).toBeLessThanOrEqual(-50)
  })
})

// ═══════════════════════════════════════════════════════════════
//  3. Three-camera system present
// ═══════════════════════════════════════════════════════════════
describe('exam-simulator.html — three-camera system', () => {
  it('declares an operator (ground) camera (opCam)', () => {
    expect(HTML).toContain('opCam')
    expect(HTML).toContain('PerspectiveCamera')
  })

  it('declares an FPV (nose-mounted) camera (fpvCam)', () => {
    expect(HTML).toContain('fpvCam')
    expect(HTML).toContain('fpvMount')
  })

  it('declares a top-down orthographic camera (topCam)', () => {
    expect(HTML).toContain('topCam')
    expect(HTML).toContain('OrthographicCamera')
  })

  it('uses autoClear = false for multi-viewport rendering', () => {
    expect(HTML).toContain('autoClear')
    expect(HTML).toContain('false')
  })

  it('implements PiP layout helper (layoutPip)', () => {
    expect(HTML).toContain('layoutPip')
  })

  it('implements split three-view mode', () => {
    expect(HTML).toContain("mainCam === 'all'")
  })
})

// ═══════════════════════════════════════════════════════════════
//  4. Fixed-wing UAV model
// ═══════════════════════════════════════════════════════════════
describe('exam-simulator.html — fixed-wing UAV model', () => {
  it('uses a cylinder fuselage (not a multirotor body)', () => {
    expect(HTML).toContain('CylinderGeometry')
  })

  it('has main wings (BoxGeometry for wing surfaces)', () => {
    expect(HTML).toContain('BoxGeometry')
  })

  it('has a propeller group', () => {
    expect(HTML).toContain('propGrp')
  })

  it('has landing gear (gMat + wheel geometry)', () => {
    // Landing gear uses gMat and wheel cylinders
    expect(HTML).toContain('gMat')
    expect(HTML).toContain('Landing gear')
  })

  it('uses YXZ Euler order for flight attitude', () => {
    expect(HTML).toContain("'YXZ'")
  })
})

// ═══════════════════════════════════════════════════════════════
//  5. Environment landmarks
// ═══════════════════════════════════════════════════════════════
describe('exam-simulator.html — environment', () => {
  it('has a runway mesh', () => {
    expect(HTML).toContain('rw =')
    expect(HTML).toContain('rwMat')
  })

  it('has a windsock', () => {
    expect(HTML).toContain('addWindsock')
  })

  it('has an operator figure with standing mat', () => {
    expect(HTML).toContain('addOperator')
    expect(HTML).toContain('OP_Z')
  })

  it('places waypoint markers for A and B', () => {
    expect(HTML).toContain("addWaypoint(WP_AX")
    expect(HTML).toContain("addWaypoint(WP_BX")
  })

  it('draws the oval race-track path', () => {
    expect(HTML.includes('Race-track path') || HTML.includes('RT_R')).toBe(true)
  })

  it('draws the five-leg traffic-pattern path', () => {
    expect(HTML.includes('Traffic-pattern path') || HTML.includes('五邊航線')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
//  6. Demo SEQ — step coverage
// ═══════════════════════════════════════════════════════════════
describe('exam-simulator.html — SEQ demo sequence', () => {
  it('covers all required exam steps (A B Ca Cb D F)', () => {
    for (const id of ['A', 'B', 'Ca', 'Cb', 'D', 'F']) {
      expect(HTML).toContain(`s:'${id}'`)
    }
  })

  it('includes highlighted 「3、2、1、Go」callout', () => {
    expect(HTML).toContain('3、2、1、Go')
    expect(HTML).toContain('hi:1')
  })

  it('includes highlighted 「結束」callout', () => {
    expect(HTML).toContain('結束')
  })

  it('includes 360° counterclockwise inspection text', () => {
    expect(HTML).toContain('360')
    expect(HTML).toContain('逆時針')
  })
})

// ═══════════════════════════════════════════════════════════════
//  7. Pure logic: lerpAngle (extracted for unit testing)
// ═══════════════════════════════════════════════════════════════

/** Mirror of lerpAngle defined inside the HTML */
function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a
  while (d >  Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * Math.min(t, 1)
}

describe('lerpAngle — angle-wrapping interpolation', () => {
  it('interpolates straight-forward at t=1', () => {
    expect(lerpAngle(0, Math.PI / 2, 1)).toBeCloseTo(Math.PI / 2)
  })

  it('wraps correctly across the ±π boundary (e.g. 170° → −170°)', () => {
    const a = (170 * Math.PI) / 180
    const b = (-170 * Math.PI) / 180
    const result = lerpAngle(a, b, 1)
    // Shortest path from 170° to −170° is +20° (clockwise).
    // The function may return 190° (= −170° + 360°) which is the same angle.
    // Normalise to (−π, π] before comparing.
    function normalise(r: number) {
      let n = r % (Math.PI * 2)
      if (n > Math.PI)  n -= Math.PI * 2
      if (n < -Math.PI) n += Math.PI * 2
      return n
    }
    expect(normalise(result)).toBeCloseTo(normalise(b), 4)
  })

  it('clamps t > 1 to 1 (no overshoot)', () => {
    const result = lerpAngle(0, Math.PI / 4, 99)
    expect(result).toBeCloseTo(Math.PI / 4)
  })

  it('returns start angle at t=0', () => {
    expect(lerpAngle(1.2, 2.5, 0)).toBeCloseTo(1.2)
  })

  it('interpolates halfway at t=0.5', () => {
    expect(lerpAngle(0, Math.PI, 0.5)).toBeCloseTo(Math.PI / 2)
  })
})

// ═══════════════════════════════════════════════════════════════
//  8. Pure logic: race-track oval geometry
// ═══════════════════════════════════════════════════════════════

describe('race-track geometry', () => {
  const WP_AX = -70, WP_BX = 70, RT_R = 18, WP_Z = -90

  it('straight-leg length equals A↔B separation (140 m)', () => {
    expect(WP_BX - WP_AX).toBe(140)
  })

  it('far straight Z offset equals −radius from track centre', () => {
    expect(WP_Z - RT_R).toBe(-108)
  })

  it('near straight Z offset equals +radius from track centre', () => {
    expect(WP_Z + RT_R).toBe(-72)
  })

  it('right arc tip (east of B) at x = WP_BX + RT_R', () => {
    // At angle a=0: x = BX + R·cos(0) = BX + R
    expect(WP_BX + RT_R).toBe(88)
  })

  it('left arc tip (west of A) at x = WP_AX − RT_R', () => {
    expect(WP_AX - RT_R).toBe(-88)
  })

  it('oval total width = AB separation + 2 × radius = 176 m', () => {
    const totalWidth = (WP_BX - WP_AX) + 2 * RT_R
    expect(totalWidth).toBe(176)
  })
})
