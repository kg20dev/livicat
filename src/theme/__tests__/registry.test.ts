/**
 * Tests for the Theme Registry.
 *
 * Verifies that built-in themes are registered with valid manifests,
 * schemes, and CSS, and that lookups by route / id behave correctly.
 */

import { describe, it, expect } from 'vitest'
import { THEMES, getThemeByRoute, getThemeById } from '../registry'
import type { ThemeManifest } from '../types'

const REQUIRED_MANIFEST_FIELDS: (keyof ThemeManifest)[] = [
  'id',
  'name',
  'creator',
  'description',
  'route',
  'storageKey',
]

describe('Theme Registry', () => {
  describe('THEMES array', () => {
    it('contains both "im" and "ink-sticker" themes', () => {
      const ids = THEMES.map((t) => t.manifest.id)
      expect(ids).toContain('im')
      expect(ids).toContain('ink-sticker')
    })

    it('each theme has a valid manifest with all required fields', () => {
      for (const theme of THEMES) {
        const { manifest } = theme
        for (const field of REQUIRED_MANIFEST_FIELDS) {
          expect(manifest[field], `manifest.${field} should be defined`).toBeDefined()
          expect(
            String(manifest[field]).length,
            `manifest.${field} should be non-empty`
          ).toBeGreaterThan(0)
        }
      }
    })

    it('each theme has a scheme array with at least one SettingDef', () => {
      for (const theme of THEMES) {
        expect(Array.isArray(theme.scheme)).toBe(true)
        expect(theme.scheme.length).toBeGreaterThanOrEqual(1)
      }
    })

    it('each theme has a non-empty css string', () => {
      for (const theme of THEMES) {
        expect(typeof theme.css).toBe('string')
        expect(theme.css.length).toBeGreaterThan(0)
      }
    })

    it('all storageKeys are unique', () => {
      const storageKeys = THEMES.map((t) => t.manifest.storageKey)
      expect(new Set(storageKeys).size).toBe(storageKeys.length)
    })

    it('all routes are unique', () => {
      const routes = THEMES.map((t) => t.manifest.route)
      expect(new Set(routes).size).toBe(routes.length)
    })

    it('all ids are unique', () => {
      const ids = THEMES.map((t) => t.manifest.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('getThemeByRoute', () => {
    it('returns the IM theme bundle for "im"', () => {
      const theme = getThemeByRoute('im')
      expect(theme).toBeDefined()
      expect(theme!.manifest.id).toBe('im')
    })

    it('returns the Neon Sticker bundle for "ink-sticker"', () => {
      const theme = getThemeByRoute('ink-sticker')
      expect(theme).toBeDefined()
      expect(theme!.manifest.id).toBe('ink-sticker')
    })

    it('returns undefined for a nonexistent route', () => {
      expect(getThemeByRoute('nonexistent')).toBeUndefined()
    })
  })

  describe('getThemeById', () => {
    it('returns the IM theme bundle for "im"', () => {
      const theme = getThemeById('im')
      expect(theme).toBeDefined()
      expect(theme!.manifest.id).toBe('im')
    })

    it('returns a valid bundle for "ink-sticker"', () => {
      const theme = getThemeById('ink-sticker')
      expect(theme).toBeDefined()
      expect(theme!.manifest.id).toBe('ink-sticker')
      expect(theme!.scheme.length).toBeGreaterThanOrEqual(1)
      expect(theme!.css.length).toBeGreaterThan(0)
    })

    it('returns undefined for a nonexistent id', () => {
      expect(getThemeById('nonexistent')).toBeUndefined()
    })
  })
})
