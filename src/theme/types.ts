/**
 * Theme Plugin System — Core Types
 *
 * Each theme is a self-contained package with:
 *   manifest.ts  → metadata, routing, storage
 *   scheme.ts    → settings UI declarations
 *   theme.css    → styles with var(--key) placeholders
 */

/* ─── Settings UI Definition ───────────────────────────────────── */

export type SettingType = 'color' | 'range' | 'toggle' | 'select'

export interface SettingDef {
  /** Unique UI key — used for settings lookup, localStorage, and analytics */
  key: string
  /** Control type */
  type: SettingType
  /** Human-readable label */
  label: string
  /** Default value */
  default: string | number | boolean
  /** Section/group name for collapsible grouping (optional, flat if omitted) */
  section?: string
  /**
   * CSS variable name override.
   * When set, buildCSSVariables emits `--{cssVar}` instead of `--{key}`.
   * Allows themes to use different CSS variable names for the same UI setting.
   * Falls back to `--{key}` when omitted.
   */
  cssVar?: string
  /** Minimum value (range only) */
  min?: number
  /** Maximum value (range only) */
  max?: number
  /** Step increment (range only) */
  step?: number
  /** Unit suffix displayed next to the value (range only) */
  unit?: string
  /** Option list (select only) */
  options?: { value: string; label: string }[]
}

/* ─── Color Derivation ─────────────────────────────────────────── */

export interface HarmonyInvertOptions {
  /** Input lightness above this = "light" source (default: 0.5) */
  lightThreshold?: number
  /** Target lightness for light source (default: 0.2) */
  darkTargetL?: number
  /** Target lightness for dark source (default: 0.8) */
  lightTargetL?: number
  /** Fraction of original saturation to keep (default: 0.35) */
  satScale?: number
  /** When true, dark sources get at least 0.65 saturation (default: false) */
  boostDarkSat?: boolean
}

/**
 * An entry in a theme's derivation map (e.g. strokeMap).
 * A plain string is shorthand for `{ target: string }` (uses default options).
 * An object allows per-entry HarmonyInvertOptions tuning.
 */
export type DerivationEntry = string | { target: string; options?: HarmonyInvertOptions }

/* ─── Theme Manifest ──────────────────────────────────────────── */

export interface ThemeManifest {
  /** Unique theme identifier (kebab-case) */
  id: string
  /** Display name shown in sidebar */
  name: string
  /** Creator credit */
  creator: string
  /** Short description */
  description: string
  /** URL route segment (e.g. "im", "ink-sticker") */
  route: string
  /** localStorage key for settings persistence */
  storageKey: string
}

/* ─── Theme Bundle (manifest + scheme + CSS) ──────────────────── */

export interface ThemeBundle {
  manifest: ThemeManifest
  scheme: SettingDef[]
  /** Raw CSS string with var(--key) placeholders */
  css: string
  /** Optional base reset CSS for normalizing YouTube DOM before theme CSS applies */
  reset?: string
}

/* ─── Runtime Settings Shape ──────────────────────────────────── */

/** Flattened key-value map matching scheme keys */
export type ThemeSettings = Record<string, string | number | boolean>
