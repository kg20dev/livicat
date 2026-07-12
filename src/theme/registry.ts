/**
 * Theme Registry
 *
 * Collects all built-in theme manifests, schemes, and CSS.
 * Sidebar and App.tsx read this to populate navigation.
 *
 * Each theme's `scheme` is the merge of CORE_SCHEME (shared settings)
 * with its own theme-specific scheme.
 */

import type { DerivationEntry, HarmonyInvertOptions, SettingDef, ThemeBundle } from './types'
import { CORE_SCHEME } from './base/core'
import { manifest as imManifest, css as imCss, reset as imReset } from './im/manifest'
import { scheme as imScheme, coreCssVarMap as imCssVarMap } from './im/scheme'
import { manifest as inkManifest, css as inkCss, reset as inkReset } from './ink-sticker/manifest'
import {
  scheme as inkScheme,
  coreCssVarMap as inkCssVarMap,
  strokeMap as inkStrokeMap,
} from './ink-sticker/scheme'
import {
  manifest as crayonManifest,
  css as crayonCss,
  reset as crayonReset,
} from './crayon/manifest'
import {
  scheme as crayonScheme,
  coreCssVarMap as crayonCssVarMap,
  strokeMap as crayonStrokeMap,
} from './crayon/scheme'
import { manifest as blockManifest, css as blockCss, reset as blockReset } from './block/manifest'
import {
  scheme as blockScheme,
  coreCssVarMap as blockCssVarMap,
  strokeMap as blockStrokeMap,
} from './block/scheme'
import {
  manifest as phantomManifest,
  css as phantomCss,
  reset as phantomReset,
} from './phantom/manifest'
import {
  scheme as phantomScheme,
  coreCssVarMap as phantomCssVarMap,
  strokeMap as phantomStrokeMap,
  postDerivations as phantomPostDerivations,
} from './phantom/scheme'

/**
 * Merge core + theme-specific scheme into a single flat array.
 * Applies the theme's cssVarMap to each core setting so buildCSSVariables
 * emits the correct `--var-name` per theme.
 */
function mergeScheme(
  themeScheme: ThemeBundle['scheme'],
  cssVarMap: Record<string, string>,
  strokeMap?: Record<string, DerivationEntry>,
  postDerivations?: Record<string, { source: string; options?: HarmonyInvertOptions }>
): ThemeBundle['scheme'] {
  const mappedCore = CORE_SCHEME.map((def) => {
    const cssVar = cssVarMap[def.key]
    if (!cssVar) return def
    return { ...def, cssVar } as SettingDef
  })
  const result = [...mappedCore, ...themeScheme]
  if (strokeMap) Object.assign(result, { strokeMap })
  if (postDerivations) Object.assign(result, { postDerivations })
  return result
}

const themes: ThemeBundle[] = [
  { manifest: imManifest, scheme: mergeScheme(imScheme, imCssVarMap), css: imCss, reset: imReset },
  {
    manifest: inkManifest,
    scheme: mergeScheme(inkScheme, inkCssVarMap, inkStrokeMap),
    css: inkCss,
    reset: inkReset,
  },
  {
    manifest: crayonManifest,
    scheme: mergeScheme(crayonScheme, crayonCssVarMap, crayonStrokeMap),
    css: crayonCss,
    reset: crayonReset,
  },
  {
    manifest: blockManifest,
    scheme: mergeScheme(blockScheme, blockCssVarMap, blockStrokeMap),
    css: blockCss,
    reset: blockReset,
  },
  {
    manifest: phantomManifest,
    scheme: mergeScheme(phantomScheme, phantomCssVarMap, phantomStrokeMap, phantomPostDerivations),
    css: phantomCss,
    reset: phantomReset,
  },
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
