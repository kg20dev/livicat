import type { ThemeManifest } from '../types'
import themeCss from './theme.css?raw'
import baseResetCss from '../base/reset.css?raw'

export const css = themeCss
export const reset = baseResetCss

export const manifest: ThemeManifest = {
  id: 'phantom',
  name: 'Phantom',
  creator: 'Livicat',
  description:
    'Persona 5 — jagged ribbon message plates with a tilted name flag, pure red/black/white palette',
  route: 'phantom',
  storageKey: 'livicat_x_phantom',
}
