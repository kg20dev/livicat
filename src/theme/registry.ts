/**
 * Theme Registry
 *
 * Collects all built-in theme manifests, schemes, and CSS.
 * Sidebar and App.tsx read this to populate navigation.
 */

import type { ThemeBundle } from './types'
import { manifest as imManifest, css as imCss, reset as imReset } from './im/manifest'
import { scheme as imScheme } from './im/scheme'
import { manifest as inkManifest, css as inkCss, reset as inkReset } from './ink-sticker/manifest'
import { scheme as inkScheme } from './ink-sticker/scheme'

const themes: ThemeBundle[] = [
  { manifest: imManifest, scheme: imScheme, css: imCss, reset: imReset },
  { manifest: inkManifest, scheme: inkScheme, css: inkCss, reset: inkReset },
]

/** All registered themes */
export const THEMES = themes

/** Lookup a theme by its route segment */
export function getThemeByRoute(route: string): ThemeBundle | undefined {
  return themes.find((t) => t.manifest.route === route)
}

/** Lookup a theme by its id */
export function getThemeById(id: string): ThemeBundle | undefined {
  return themes.find((t) => t.manifest.id === id)
}
