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
  /** Unique key matching the CSS variable name (without `var(--`) */
  key: string
  /** Control type */
  type: SettingType
  /** Human-readable label */
  label: string
  /** Default value */
  default: string | number | boolean
  /** Section/group name for collapsible grouping (optional, flat if omitted) */
  section?: string
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
