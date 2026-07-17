/**
 * Theme Marketplace Tests
 *
 * Validates install/uninstall flow, .livicat folder scanning,
 * and built-in theme detection.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  scanMarketplaceDir,
  installTheme,
  uninstallTheme,
  getInstalledThemes,
  getUninstalledThemes,
  isBuiltinTheme,
  getProjectPath,
  getManifestPath,
} from '../index'
import type { ThemeMarketplaceEntry } from '../types'

describe('Theme Marketplace', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('scanMarketplaceDir', () => {
    it('finds phantom.livicat in installed directory', () => {
      const entries = scanMarketplaceDir()
      expect(entries.length).toBeGreaterThanOrEqual(1)

      const phantom = entries.find((e) => e.id === 'phantom')
      expect(phantom).toBeDefined()
      expect(phantom!.status).toBe('installed')
      expect(phantom!.packagePath).toBe('installed/phantom.livicat')
      expect(phantom!.engine).toBe('monkeywork-v1')
    })

    it('returns correct package structure', () => {
      const entries = scanMarketplaceDir()
      const phantom = entries.find((e) => e.id === 'phantom')!
      expect(getProjectPath(phantom)).toBe('installed/phantom.livicat/project.livi')
      expect(getManifestPath(phantom)).toBe('installed/phantom.livicat/manifest.json')
    })

    it('returns empty uninstalled list initially', () => {
      const entries = scanMarketplaceDir()
      const uninstalled = entries.filter((e) => e.status === 'uninstalled')
      expect(uninstalled).toHaveLength(0)
    })
  })

  describe('install / uninstall', () => {
    const entries: ThemeMarketplaceEntry[] = [
      {
        id: 'test-theme',
        name: 'Test Theme',
        author: 'Test',
        description: 'A test theme',
        status: 'installed',
        packagePath: 'installed/test-theme.livicat',
        engine: 'monkeywork-v1',
      },
      {
        id: 'available-theme',
        name: 'Available Theme',
        author: 'Test',
        description: 'An available theme',
        status: 'uninstalled',
        packagePath: 'uninstalled/available-theme.livicat',
        engine: 'monkeywork-v1',
      },
    ]

    it('uninstall changes status to uninstalled', () => {
      const updated = uninstallTheme(entries, 'test-theme')
      const testTheme = updated.find((e) => e.id === 'test-theme')
      expect(testTheme!.status).toBe('uninstalled')
    })

    it('install changes status to installed', () => {
      const updated = installTheme(entries, 'available-theme')
      const available = updated.find((e) => e.id === 'available-theme')
      expect(available!.status).toBe('installed')
    })

    it('persists status to localStorage', () => {
      uninstallTheme(entries, 'test-theme')
      const saved = JSON.parse(localStorage.getItem('livicat_marketplace_status')!)
      expect(saved['test-theme']).toBe('uninstalled')
    })

    it('getInstalledThemes returns only installed', () => {
      const updated = uninstallTheme(entries, 'test-theme')
      const installed = getInstalledThemes(updated)
      expect(installed.every((e) => e.status === 'installed')).toBe(true)
      expect(installed.find((e) => e.id === 'test-theme')).toBeUndefined()
    })

    it('getUninstalledThemes returns only uninstalled', () => {
      const updated = uninstallTheme(entries, 'test-theme')
      const uninstalled = getUninstalledThemes(updated)
      expect(uninstalled.every((e) => e.status === 'uninstalled')).toBe(true)
      expect(uninstalled.find((e) => e.id === 'test-theme')).toBeDefined()
    })

    it('does not mutate original entries array', () => {
      const original = [...entries]
      uninstallTheme(entries, 'test-theme')
      expect(entries).toEqual(original)
    })
  })

  describe('isBuiltinTheme', () => {
    it('recognizes all built-in themes', () => {
      expect(isBuiltinTheme('im')).toBe(true)
      expect(isBuiltinTheme('ink-sticker')).toBe(true)
      expect(isBuiltinTheme('crayon')).toBe(true)
      expect(isBuiltinTheme('block')).toBe(true)
      expect(isBuiltinTheme('phantom')).toBe(true)
    })

    it('rejects non-built-in themes', () => {
      expect(isBuiltinTheme('custom-theme')).toBe(false)
      expect(isBuiltinTheme('marketplace-theme')).toBe(false)
    })
  })

  describe('package paths', () => {
    it('returns correct project.livi path', () => {
      const entry: ThemeMarketplaceEntry = {
        id: 'test',
        name: 'Test',
        author: 'Test',
        description: '',
        status: 'installed',
        packagePath: 'installed/test.livicat',
      }
      expect(getProjectPath(entry)).toBe('installed/test.livicat/project.livi')
    })

    it('returns correct manifest.json path', () => {
      const entry: ThemeMarketplaceEntry = {
        id: 'test',
        name: 'Test',
        author: 'Test',
        description: '',
        status: 'installed',
        packagePath: 'installed/test.livicat',
      }
      expect(getManifestPath(entry)).toBe('installed/test.livicat/manifest.json')
    })
  })
})
