/**
 * Build CSS Variables from theme settings
 *
 * Converts theme settings into CSS variable declarations.
 * Handles animation speed mapping, message spacing, and username weight.
 */

import type { SettingDef, ThemeSettings } from '../theme/types'

export function buildCSSVariables(settings: ThemeSettings, scheme: SettingDef[]): string {
  const lines: string[] = [':root {']
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

  lines.push('}')
  return lines.join('\n')
}
