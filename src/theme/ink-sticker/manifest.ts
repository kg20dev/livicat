import type { ThemeManifest } from '../types'
import css from './theme.css?raw'

export { css }

export const manifest: ThemeManifest = {
  id: 'ink-sticker',
  name: 'Ink Sticker',
  creator: 'doodlekuma',
  description: 'Hand-drawn sticker-style chat with skew, stroke, and shadow effects',
  route: 'ink-sticker',
  storageKey: 'livicat_x_ink',
}
