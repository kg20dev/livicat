import type { ThemeManifest } from '../types'
import themeCss from './theme.css?raw'
import baseResetCss from '../base/reset.css?raw'

export const css = themeCss
export const reset = baseResetCss

export const manifest: ThemeManifest = {
  id: 'block',
  name: 'Block',
  creator: 'Livicat',
  description:
    '8-bit Minecraft UI — beveled stone panels, pixel fonts, and chunky block-place motion',
  route: 'block',
  storageKey: 'livicat_x_block',
}
