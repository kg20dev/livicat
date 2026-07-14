/**
 * Contrast color utility — returns pure black or white
 * based on the perceived luminance of a background color.
 *
 * Uses WCAG 2.1 relative luminance formula.
 * Threshold 0.179 per WCAG (sRGB midpoint).
 */

/** Linearize sRGB channel (gamma expansion). */
function linearize(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/**
 * Returns '#000000' or '#ffffff' — whichever contrasts best
 * against the given hex background color.
 *
 * @example
 * contrastColor('#2d1b00') // '#ffffff' (dark bg → white)
 * contrastColor('#ffd700') // '#000000' (light bg → black)
 */
export function contrastColor(hex: string): '#000000' | '#ffffff' {
  const h = hex.replace('#', '')
  const r = linearize(parseInt(h.substring(0, 2), 16))
  const g = linearize(parseInt(h.substring(2, 4), 16))
  const b = linearize(parseInt(h.substring(4, 6), 16))
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance >= 0.179 ? '#000000' : '#ffffff'
}
