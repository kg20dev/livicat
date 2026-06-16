import type { ThemeManifest } from '../types'
import css from './theme.css?raw'
import baseResetCss from '../base/reset.css?raw'

export { css }
export const reset = baseResetCss

export const manifest: ThemeManifest = {
  id: 'ink-sticker',
  name: 'Neon Sticker',
  creator: 'Livicat',
  description: 'Hand-drawn sticker-style chat with skew, stroke, and shadow effects',
  route: 'ink-sticker',
  storageKey: 'livicat_x_ink',
}
