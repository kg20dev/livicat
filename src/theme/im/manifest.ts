import type { ThemeManifest } from '../types'
import themeCss from './theme.css?raw'
import baseResetCss from '../base/reset.css?raw'

export const css = themeCss
export const reset = baseResetCss

export const manifest: ThemeManifest = {
  id: 'im',
  name: 'Colour Bubble',
  creator: 'Livicat',
  description:
    'Playful bubble chat with role-tinted messages, animated name tags, and punctuation effects',
  route: 'im',
  storageKey: 'livicat_x_im',
}
