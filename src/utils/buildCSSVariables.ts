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

export function buildCSSVariables(settings: ThemeSettings, scheme: SettingDef[]): string {
  const imports: string[] = []
  // Check for Google Font import
  const fontFamily = settings['chat-font-family'] as string | undefined
  if (fontFamily) {
    const fontImport = getGoogleFontImport(fontFamily)
    if (fontImport) imports.push(fontImport)
  }
  const lines: string[] = imports.length > 0 ? [...imports, '', ':root {'] : [':root {']
  for (const def of scheme) {
    const value = settings[def.key] ?? def.default
    // Append unit for numeric range settings (px, em etc.)
    // Skip '%' — used in calc(.../100) and needs to remain unitless
    if (def.type === 'range' && def.unit && def.unit !== '%') {
      lines.push(`  --${def.key}: ${value}${def.unit};`)
    } else {
      lines.push(`  --${def.key}: ${value};`)
    }
  }

  // Animation-derived variables (for IM theme)
  const animSpeed = (settings['chat-animation-speed'] as string) ?? 'normal'
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

  // Message spacing (for IM theme)
  const spacing = (settings['chat-message-spacing'] as string) ?? 'normal'
  if (spacing === 'compact') lines.push('  --chat-message-spacing: 4px;')
  else if (spacing === 'comfortable') lines.push('  --chat-message-spacing: 16px;')
  else lines.push('  --chat-message-spacing: 10px;')

  // Username weight (for IM theme)
  const bold = settings['chat-username-font-weight']
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
