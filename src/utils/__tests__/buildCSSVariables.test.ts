/**
 * Tests for buildCSSVariables and harmonyInvertColor
 *
 * These are pure color-math and CSS-generation functions.
 * No mocking needed — test inputs in, assert outputs out.
 */
import { describe, it, expect } from 'vitest'
import { buildCSSVariables, harmonyInvertColor } from '../buildCSSVariables'
import type { SettingDef, ThemeSettings, HarmonyInvertOptions } from '../../theme/types'

/* ─── harmonyInvertColor ──────────────────────────────────── */

describe('harmonyInvertColor', () => {
  it('inverts light color to dark', () => {
    const result = harmonyInvertColor('#e0e0e0')
    expect(result).toBe('#333333')
  })

  it('inverts dark color to light', () => {
    const result = harmonyInvertColor('#00b140')
    // Dark green (l=0.35 < 0.5) → light with muted saturation
    expect(result.startsWith('#')).toBe(true)
    // Should be a lighter green (hue preserved)
    const r = parseInt(result.slice(1, 3), 16)
    const g = parseInt(result.slice(3, 5), 16)
    const b = parseInt(result.slice(5, 7), 16)
    // All channels should be > 128 (light result)
    expect(r).toBeGreaterThan(128)
    expect(g).toBeGreaterThan(128)
    expect(b).toBeGreaterThan(128)
  })

  it('preserves hue for saturated light colors', () => {
    const result = harmonyInvertColor('#ff8c42')
    // Should be very dark warm brown
    expect(result.startsWith('#')).toBe(true)
    // Orange-red hue → red channel highest
    const r = parseInt(result.slice(1, 3), 16)
    const g = parseInt(result.slice(3, 5), 16)
    const b = parseInt(result.slice(5, 7), 16)
    expect(r).toBeGreaterThan(g)
    expect(r).toBeGreaterThan(b)
  })

  it('preserves hue for saturated dark colors', () => {
    const result = harmonyInvertColor('#003366')
    // Dark blue (l < 0.5) → light blue
    expect(result.startsWith('#')).toBe(true)
    const r = parseInt(result.slice(1, 3), 16)
    const g = parseInt(result.slice(3, 5), 16)
    const b = parseInt(result.slice(5, 7), 16)
    // Blue channel should be highest
    expect(b).toBeGreaterThan(r)
    expect(b).toBeGreaterThan(g)
  })

  it('handles pure black', () => {
    // black → l=0 < 0.5 → light result
    const result = harmonyInvertColor('#000000')
    expect(result.startsWith('#')).toBe(true)
    const r = parseInt(result.slice(1, 3), 16)
    expect(r).toBeGreaterThanOrEqual(200)
  })

  it('handles pure white', () => {
    // white → l=1.0 >= 0.5 → dark result
    const result = harmonyInvertColor('#ffffff')
    expect(result).toBe('#333333')
  })

  it('mutes saturation to ~35% of original', () => {
    const fullSat = harmonyInvertColor('#ff0000') // pure red, s=1.0
    const halfSat = harmonyInvertColor('#ff8080') // pink, s=~0.5
    // Both should be dark (l >= 0.5 → dark result)
    expect(fullSat.startsWith('#')).toBe(true)
    expect(halfSat.startsWith('#')).toBe(true)
  })
})

/* ─── harmonyInvertColor with chip options ──────────────────── */

const CHIP_OPTS: HarmonyInvertOptions = {
  lightThreshold: 0.35,
  darkTargetL: 0.3,
  lightTargetL: 0.45,
  satScale: 1,
  boostDarkSat: true,
}

describe('harmonyInvertColor (chip style)', () => {
  it('derives medium chip from dark background', () => {
    const result = harmonyInvertColor('#1a1a2e', CHIP_OPTS)
    // Very dark bg → medium-light chip
    expect(result.startsWith('#')).toBe(true)
    const r = parseInt(result.slice(1, 3), 16)
    const g = parseInt(result.slice(3, 5), 16)
    const b = parseInt(result.slice(5, 7), 16)
    // Should be medium lightness (all channels ~ 50-180)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    expect(max).toBeGreaterThanOrEqual(40)
    expect(min).toBeGreaterThanOrEqual(30)
  })

  it('derives darker chip from light background', () => {
    const result = harmonyInvertColor('#e0e0e0', CHIP_OPTS)
    // Light bg → darker chip
    const r = parseInt(result.slice(1, 3), 16)
    expect(r).toBeLessThan(128)
  })

  it('preserves hue for saturated backgrounds', () => {
    const result = harmonyInvertColor('#2d1b00', CHIP_OPTS) // dark orange
    expect(result.startsWith('#')).toBe(true)
    const r = parseInt(result.slice(1, 3), 16)
    const b = parseInt(result.slice(5, 7), 16)
    // Should still be warm (red highest, blue lowest)
    expect(r).toBeGreaterThan(b)
  })
})

/* ─── buildCSSVariables ───────────────────────────────────── */

describe('buildCSSVariables', () => {
  const sampleScheme: SettingDef[] = [
    { key: 'messageColor', type: 'color', label: 'Text', default: '#e0e0e0' },
    { key: 'ownerText', type: 'color', label: 'Owner Text', default: '#ff8c42' },
    {
      key: 'strokeWidth',
      type: 'range',
      label: 'Stroke Width',
      min: 0,
      max: 5,
      default: 1,
      unit: 'px',
    },
    { key: 'shadowColor', type: 'color', label: 'Shadow', default: '#000000' },
    { key: 'someToggle', type: 'toggle', label: 'Toggle', default: false },
  ]

  it('emits basic CSS variables', () => {
    const settings: ThemeSettings = {}
    const css = buildCSSVariables(settings, sampleScheme)
    expect(css).toContain('--messageColor: #e0e0e0;')
    expect(css).toContain('--shadowColor: #000000;')
  })

  it('prefers user settings over defaults', () => {
    const settings: ThemeSettings = { messageColor: '#ff0000' }
    const css = buildCSSVariables(settings, sampleScheme)
    expect(css).toContain('--messageColor: #ff0000;')
  })

  it('uses cssVar override when present', () => {
    const scheme: SettingDef[] = [
      {
        key: 'text-color',
        cssVar: 'messageColor',
        type: 'color',
        label: 'Text',
        default: '#e0e0e0',
      },
    ]
    const css = buildCSSVariables({}, scheme)
    expect(css).toContain('--messageColor: #e0e0e0;')
    expect(css).not.toContain('--text-color')
  })

  describe('strokeMap gating', () => {
    it('emits derived stroke vars when strokeMap is attached', () => {
      const scheme = [...sampleScheme]
      Object.assign(scheme, {
        strokeMap: {
          messageColor: 'strokeColor',
          ownerText: 'ownerStroke',
        },
      })
      const css = buildCSSVariables({}, scheme)
      expect(css).toContain('--strokeColor: #333333;')
      expect(css).toContain('--ownerStroke:')
    })

    it('does NOT emit stroke vars when no strokeMap', () => {
      // sampleScheme has strokeWidth but no strokeMap attached
      const css = buildCSSVariables({}, sampleScheme)
      expect(css).not.toContain('--strokeColor')
      expect(css).not.toContain('--ownerStroke')
    })

    it('derives correct stroke color from custom setting', () => {
      const scheme = [...sampleScheme]
      Object.assign(scheme, {
        strokeMap: { messageColor: 'strokeColor' },
      })
      const css = buildCSSVariables({ messageColor: '#ffffff' }, scheme)
      // white → dark stroke
      expect(css).toContain('--strokeColor: #333333;')
    })
  })

  describe('chip derivation', () => {
    it('emits chip vars for bg colors', () => {
      const scheme: SettingDef[] = [
        { key: 'ownerBg', type: 'color', label: 'Owner BG', default: '#2d1b00' },
      ]
      const css = buildCSSVariables({}, scheme)
      expect(css).toContain('--ownerBg: #2d1b00;')
      expect(css).toContain('--ownerChipBg:')
    })

    it('does not emit chips for non-bg colors', () => {
      const scheme: SettingDef[] = [
        { key: 'ownerText', type: 'color', label: 'Owner Text', default: '#ff8c42' },
      ]
      const css = buildCSSVariables({}, scheme)
      expect(css).toContain('--ownerText:')
      // No chip var since it doesn't end in -bg or Bg
      expect(css).not.toContain('--ownerChip')
    })
  })

  describe('animation speed', () => {
    it('emits 0s for none', () => {
      const css = buildCSSVariables({ 'animation-speed': 'none' }, [])
      expect(css).toContain('--animation-duration: 0s;')
    })

    it('emits 0.6s for slow', () => {
      const css = buildCSSVariables({ 'animation-speed': 'slow' }, [])
      expect(css).toContain('--animation-duration: 0.6s;')
    })

    it('defaults to 0.4s', () => {
      const css = buildCSSVariables({}, [])
      expect(css).toContain('--animation-duration: 0.4s;')
    })
  })

  describe('message spacing', () => {
    const messageSpacingScheme = [
      {
        key: 'message-spacing',
        type: 'range' as const,
        label: 'Message Spacing',
        min: 0,
        max: 40,
        default: 10,
        unit: 'px',
        cssVar: 'chat-message-spacing',
      },
    ]

    it('emits the set pixel value', () => {
      const css = buildCSSVariables({ 'message-spacing': 4 }, messageSpacingScheme)
      expect(css).toContain('--chat-message-spacing: 4px;')
    })

    it('emits default value when unset', () => {
      const css = buildCSSVariables({}, messageSpacingScheme)
      expect(css).toContain('--chat-message-spacing: 10px;')
    })
  })

  describe('YouTube hiding', () => {
    it('emits hide rules when enabled', () => {
      const css = buildCSSVariables({ 'hide-youtube-generic': true }, [])
      expect(css).toContain('display: none !important;')
    })

    it('does not emit hide rules when disabled', () => {
      const css = buildCSSVariables({}, [])
      expect(css).not.toContain('hide-youtube-generic')
    })
  })

  describe('chroma key', () => {
    it('emits green background when enabled', () => {
      const css = buildCSSVariables({ 'chroma-key': true }, [])
      expect(css).toContain('background-color: #00b140 !important;')
    })

    it('does not emit chroma key when disabled', () => {
      const css = buildCSSVariables({}, [])
      expect(css).not.toContain('#00b140')
    })
  })

  describe('user settings override', () => {
    it('uses provided settings value over default', () => {
      const scheme: SettingDef[] = [
        { key: 'glowColor', type: 'color', label: 'Glow', default: '#bb86fc' },
      ]
      const css = buildCSSVariables({ glowColor: '#ff0000' }, scheme)
      expect(css).toContain('--glowColor: #ff0000;')
      expect(css).not.toContain('#bb86fc')
    })
  })

  describe('root block wrapper', () => {
    it('wraps variables inside :root block', () => {
      const css = buildCSSVariables({}, sampleScheme)
      expect(css).toMatch(/:root\s*\{/)
      expect(css).toContain('}')
    })
  })
})
