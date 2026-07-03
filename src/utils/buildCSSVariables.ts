/**
 * Build CSS Variables from theme settings
 *
 * Converts theme settings into CSS variable declarations.
 * Handles animation speed mapping, message spacing, and username weight.
 * Also injects @import for Google Fonts when a web font is selected.
 */

import type {
  SettingDef,
  ThemeSettings,
  HarmonyInvertOptions,
  DerivationEntry,
} from '../theme/types'
import { getFontUrl } from './fonts'

/** Option value → Google Font @import rule, or null for system fonts. */
function getGoogleFontImport(fontFamily: string): string | null {
  const url = getFontUrl(fontFamily)
  if (!url) return null
  return `@import url('${url}');`
}

/* ── HSL utilities ─────────────────────────────────────────────── */

interface Hsl {
  h: number
  s: number
  l: number
}

/** Extract HSL from a 6-digit hex color string. */
function hexToHsl(hex: string): Hsl {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let hue = 0
  let sat = 0
  const lit = (max + min) / 2
  if (max !== min) {
    const d = max - min
    sat = lit > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        hue = ((b - r) / d + 2) / 6
        break
      case b:
        hue = ((r - g) / d + 4) / 6
        break
    }
  }
  return { h: hue, s: sat, l: lit }
}

/** Convert HSL to a 6-digit hex string. */
function hslToHex(h: number, s: number, l: number): string {
  const fn = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = Math.round(fn(p, q, h + 1 / 3) * 255)
  const g = Math.round(fn(p, q, h) * 255)
  const b = Math.round(fn(p, q, h - 1 / 3) * 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/* ── Harmony invert lightness ────────────────────────────────── */

/**
 * Keep the same hue, shift lightness in the opposite direction,
 * and scale saturation by a factor.
 *
 * Default (no options): light text → very dark, muted.
 *                        dark text → very light, muted.
 *
 * For chip backgrounds from bubble backgrounds, pass chip-specific
 * options (darker target, boosted sat for dark sources).
 */
export function harmonyInvertColor(hex: string, options?: HarmonyInvertOptions): string {
  const { h, s, l } = hexToHsl(hex)
  const {
    lightThreshold = 0.5,
    darkTargetL = 0.2,
    lightTargetL = 0.8,
    satScale = 0.35,
    boostDarkSat = false,
  } = options ?? {}
  const targetL = l >= lightThreshold ? darkTargetL : lightTargetL
  const targetS = boostDarkSat && l < lightThreshold ? Math.max(s, 0.65) : s * satScale
  return hslToHex(h, targetS, targetL)
}

export function buildCSSVariables(settings: ThemeSettings, scheme: SettingDef[]): string {
  const imports: string[] = []
  // Check for Google Font import
  const fontFamily = settings['font-family'] as string | undefined
  if (fontFamily) {
    const fontImport = getGoogleFontImport(fontFamily)
    if (fontImport) imports.push(fontImport)
  }
  const lines: string[] = imports.length > 0 ? [...imports, '', ':root {'] : [':root {']
  for (const def of scheme) {
    const value = settings[def.key] ?? def.default
    // Use cssVar when set, otherwise fall back to the UI key
    const cssName = def.cssVar || def.key
    // Append unit for numeric range settings (px, em etc.)
    // Skip '%' — used in calc(.../100) and needs to remain unitless
    if (def.type === 'range' && def.unit && def.unit !== '%') {
      lines.push(`  --${cssName}: ${value}${def.unit};`)
    } else {
      lines.push(`  --${cssName}: ${value};`)
    }
    // Derive chip background from role bg colors
    // Same hue, opposite lightness — chip stands out from the bubble
    // Supports both kebab-case (--chat-owner-bg → --chat-owner-chip-bg)
    // and camelCase (--messageBg → --messageChipBg, --ownerBg → --ownerChipBg)
    if ((cssName.endsWith('-bg') || cssName.endsWith('Bg')) && def.type === 'color') {
      const chipVar = cssName.endsWith('-bg')
        ? cssName.replace(/-bg$/, '-chip-bg')
        : cssName.replace(/Bg$/, 'ChipBg')
      const hex =
        typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : (def.default as string)
      lines.push(
        `  --${chipVar}: ${harmonyInvertColor(hex, { lightThreshold: 0.35, darkTargetL: 0.3, lightTargetL: 0.45, satScale: 1, boostDarkSat: true })};`
      )
    }

    // Derive contrast color via theme-specific derivationMap (e.g. strokeMap).
    // A plain string entry uses default harmonyInvertColor options (stroke style).
    // An object entry can specify per-target options (e.g. glow stays light).
    // Only fires when the scheme array has a derivationMap attached.
    const derivationMap = (scheme as { strokeMap?: Record<string, DerivationEntry> }).strokeMap
    if (derivationMap && cssName in derivationMap && def.type === 'color') {
      const entry = derivationMap[cssName]
      const target = typeof entry === 'string' ? entry : entry.target
      const opts: HarmonyInvertOptions | undefined =
        typeof entry === 'string' ? undefined : entry.options
      const hex =
        typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : (def.default as string)
      lines.push(`  --${target}: ${harmonyInvertColor(hex, opts)};`)
    }
  }

  // Animation-derived variables
  const animSpeed = (settings['animation-speed'] as string) ?? 'normal'
  if (animSpeed === 'none') {
    lines.push('  --animation-duration: 0s;')
    lines.push('  --chip-duration: 0s;')
    lines.push('  --chip-delay: 0s;')
  } else if (animSpeed === 'slow') {
    lines.push('  --animation-duration: 0.6s;')
    lines.push('  --chip-duration: 0.5s;')
    lines.push('  --chip-delay: 0.05s;')
  } else {
    lines.push('  --animation-duration: 0.4s;')
    lines.push('  --chip-duration: 0.35s;')
    lines.push('  --chip-delay: 0.05s;')
  }

  // Username weight (computed 400/700)
  const bold = settings['username-bold']
  lines.push(`  --chat-username-font-weight: ${bold ? 700 : 400};`)

  // Close :root block
  lines.push('}')

  // ── Animation-name rules (IM theme only) ───────────────────────
  // Emitted as direct CSS rules (NOT CSS variables) because
  // var(--foo) in animation-name doesn't always resolve inside
  // YouTube's custom element DOM.
  //
  // Guard: only emit when the scheme has animation settings (IM).
  const hasChipAnim = scheme.some((d) => d.key === 'chat-username-animation')
  const hasMsgAnim = scheme.some((d) => d.key === 'chat-message-animation')
  if (hasChipAnim || hasMsgAnim) {
    const CHIP_ANIMS: Record<string, string> = {
      slide: 'theme-im-chip-slide',
      wiggle: 'theme-im-chip-wiggle',
      pop: 'theme-im-chip-pop',
      fade: 'theme-im-chip-fade',
    }
    const MSG_ANIMS: Record<string, string> = {
      slide: 'theme-im-msg-slide',
      bounce: 'theme-im-msg-bounce',
      pop: 'theme-im-msg-pop',
      fade: 'theme-im-msg-fade',
    }
    const chipType = (settings['chat-username-animation'] as string) ?? 'slide'
    const msgType = (settings['chat-message-animation'] as string) ?? 'slide'
    const chipAnimName = CHIP_ANIMS[chipType] ?? 'theme-im-chip-slide'
    const msgAnimName = MSG_ANIMS[msgType] ?? 'theme-im-msg-slide'
    lines.push('')
    lines.push(`#content #author-name { animation-name: ${chipAnimName} !important; }`)
    lines.push(`#content #message { animation-name: ${msgAnimName} !important; }`)
  }

  // ── YouTube element hiding rules (all themes) ──────────────────
  // These target YouTube's DOM directly, no theme prefix needed.
  if (settings['hide-youtube-generic']) {
    lines.push('')
    lines.push('yt-live-chat-placeholder-message-renderer,')
    lines.push('yt-live-chat-membership-item-renderer,')
    lines.push('yt-live-chat-viewer-engagement-message-renderer,')
    lines.push('yt-live-chat-legacy-paid-message-renderer,')
    lines.push('yt-live-chat-purchase-message-renderer {')
    lines.push('  display: none !important;')
    lines.push('}')
  }
  if (settings['hide-youtube-header']) {
    lines.push('')
    lines.push('yt-live-chat-header-renderer {')
    lines.push('  display: none !important;')
    lines.push('}')
  }
  if (settings['hide-youtube-footer']) {
    lines.push('')
    lines.push('yt-live-chat-input-renderer {')
    lines.push('  display: none !important;')
    lines.push('}')
  }
  if (settings['hide-youtube-signin']) {
    lines.push('')
    lines.push('yt-live-chat-message-renderer[subtext-on-bottom] {')
    lines.push('  display: none !important;')
    lines.push('}')
  }

  // ── Transparent background for OBS overlay ────────────────────
  if (settings['obs-bg-transparent']) {
    lines.push('')
    lines.push('/* Transparent Background for OBS */')
    lines.push('body, html, #content, yt-live-chat-app, yt-live-chat-renderer {')
    lines.push('  background: transparent !important;')
    lines.push('  background-color: transparent !important;')
    lines.push('}')
  }

  // ── Hide @ prefix on usernames ─────────────────────────────
  // @ is stripped from data by Rust. The shorter text narrows the
  // author chip, which can cause layout shifts (bubble tail closer
  // to avatar). We compensate with a min-width + centered text.
  if (settings['hide-username-atsign']) {
    lines.push('')
    lines.push('/* Hide @ prefix in usernames — chip balance */')
    lines.push('#content #author-name {')
    lines.push('  min-width: 2em !important;')
    lines.push('  text-align: center !important;')
    lines.push('}')
  }

  // ── Chroma key mode: green background for OBS keying ─────────
  if (settings['chroma-key']) {
    lines.push('')
    lines.push('/* Chroma Key Mode */')
    lines.push('body, html {')
    lines.push('  background-color: #00b140 !important;')
    lines.push('  margin: 0 !important;')
    lines.push('  padding: 0 !important;')
    lines.push('}')
    lines.push('yt-live-chat-app,')
    lines.push('yt-live-chat-item-list-renderer,')
    lines.push('#chat-messages,')
    lines.push('.livicat-chat-messages {')
    lines.push('  background-color: #00b140 !important;')
    lines.push('}')
  }

  return lines.join('\n')
}
