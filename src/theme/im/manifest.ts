import type { ThemeManifest } from '../types'
import themeCss from './theme.css?raw'
import baseResetCss from '../base/reset.css?raw'

export const css = themeCss
export const reset = baseResetCss

export const manifest: ThemeManifest = {
  id: 'im',
  name: 'Colour Bubble',
  creator: 'Livicat',
  description: 'Classic IM-style chat with rotated name chips and bubble tails',
  route: 'im',
  storageKey: 'livicat_x_im',
}
