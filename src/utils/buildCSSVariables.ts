/**
 * Build CSS Variables from theme settings
 *
 * Converts theme settings into CSS variable declarations.
 * Handles animation speed mapping, message spacing, and username weight.
 * Also injects @import for Google Fonts when a web font is selected.
 */

import type { SettingDef, ThemeSettings } from '../theme/types'
import { getFontUrl } from './fonts'

/** Option value → Google Font @import rule, or null for system fonts. */
function getGoogleFontImport(fontFamily: string): string | null {
  const url = getFontUrl(fontFamily)
  if (!url) return null
  return `@import url('${url}');`
}

/* ── Contrasting chip helper ────────────────────────────────────── */
/**
 * Derive a chip background from a role bubble background.
 * Keeps the same hue (harmony) but shifts lightness in the opposite
 * direction — dark bubbles get a medium-light chip, light bubbles
 * get a darker chip — so the chip clearly stands out from the bubble.
 */
function chipFromBg(hex: string): string {
  const h = hex.replace('#', '')
  let r = parseInt(h.substring(0, 2), 16) / 255
  let g = parseInt(h.substring(2, 4), 16) / 255
  let b = parseInt(h.substring(4, 6), 16) / 255

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

  // Same hue, shift lightness in opposite direction
  const targetL = lit < 0.35 ? 0.45 : 0.3
  // Boost saturation for dark bgs, keep original for light bgs
  const targetS = lit < 0.35 ? Math.max(sat, 0.65) : sat

  // HSL → RGB
  const fn = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const q = targetL < 0.5 ? targetL * (1 + targetS) : targetL + targetS - targetL * targetS
  const p = 2 * targetL - q

  r = Math.round(fn(p, q, hue + 1 / 3) * 255)
  g = Math.round(fn(p, q, hue) * 255)
  b = Math.round(fn(p, q, hue - 1 / 3) * 255)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
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
      lines.push(`  --${chipVar}: ${chipFromBg(hex)};`)
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

  // Message spacing (computed px values)
  const spacing = (settings['message-spacing'] as string) ?? 'normal'
  if (spacing === 'compact') lines.push('  --chat-message-spacing: 4px;')
  else if (spacing === 'comfortable') lines.push('  --chat-message-spacing: 16px;')
  else lines.push('  --chat-message-spacing: 10px;')

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
