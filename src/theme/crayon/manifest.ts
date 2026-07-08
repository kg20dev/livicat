import type { ThemeManifest } from '../types'
import themeCss from './theme.css?raw'
import baseResetCss from '../base/reset.css?raw'

export const css = themeCss
export const reset = baseResetCss

export const manifest: ThemeManifest = {
  id: 'crayon',
  name: 'Crayon',
  creator: 'Livicat',
  description:
    'Hand-crayon soul — wobbly paper cards with thick outlines, asymmetric corners, and crayon-box role colors',
  route: 'crayon',
  storageKey: 'livicat_x_crayon',
}
