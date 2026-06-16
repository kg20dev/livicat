/**
 * useThemeSettings — Generic scoped settings hook for themes
 *
 * Each theme gets its own localStorage key for complete isolation.
 * Switching themes never cross-contaminates settings.
 */

import { useState, useCallback } from 'react'
import type { ThemeSettings } from '../theme/types'
import type { SettingDef } from '../theme/types'

// App version for settings migration
const APP_VERSION = '0.9.0'
const VERSION_KEY = '__livicat_settings_version__'

/* ─── Internal: load from localStorage ─────────────────────────── */

function loadSettings(storageKey: string, scheme: SettingDef[]): ThemeSettings {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      const storedVersion = localStorage.getItem(`${storageKey}${VERSION_KEY}`)

      // If version mismatch or no version stored → migrate
      if (storedVersion !== APP_VERSION) {
        return migrateSettings(parsed, scheme, storedVersion)
      }

      // Version matches → return as-is (no structure changes)
      return parsed
    }
  } catch {
    // Corrupted or unavailable storage — use defaults
  }
  return getDefaults(scheme)
}

function migrateSettings(parsed: ThemeSettings, scheme: SettingDef[]): ThemeSettings {
  const validKeys = new Set(scheme.map((d) => d.key))

  // Add missing fields with defaults
  for (const def of scheme) {
    if (!(def.key in parsed)) {
      parsed[def.key] = def.default
    }
  }

  // Remove unknown keys (cleanup removed settings)
  for (const key of Object.keys(parsed)) {
    if (!validKeys.has(key)) {
      delete parsed[key]
    }
  }

  return parsed
}

function saveSettings(storageKey: string, settings: ThemeSettings): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings))
    localStorage.setItem(`${storageKey}${VERSION_KEY}`, APP_VERSION)
  } catch {
    // Storage unavailable (quota exceeded, private mode, etc.)
  }
}

/* ─── Build defaults from scheme ──────────────────────────────── */

function getDefaults(scheme: SettingDef[]): ThemeSettings {
  const result: ThemeSettings = {}
  for (const def of scheme) {
    result[def.key] = def.default
  }
  return result
}

/* ─── Hook ─────────────────────────────────────────────────────── */

export function useThemeSettings(storageKey: string, scheme: SettingDef[]) {
  const [settings, setSettings] = useState<ThemeSettings>(() => loadSettings(storageKey, scheme))

  const updateSetting = useCallback(
    (key: string, value: string | number | boolean) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value }
        saveSettings(storageKey, next)
        return next
      })
    },
    [storageKey]
  )

  const updateSettings = useCallback(
    (partial: Partial<ThemeSettings>) => {
      setSettings((prev) => {
        const next: ThemeSettings = { ...prev }
        for (const [key, value] of Object.entries(partial)) {
          if (value !== undefined) {
            next[key] = value
          }
        }
        saveSettings(storageKey, next)
        return next
      })
    },
    [storageKey]
  )

  const resetSettings = useCallback(() => {
    const defaults = getDefaults(scheme)
    setSettings(defaults)
    saveSettings(storageKey, defaults)
  }, [storageKey, scheme])

  const clearSettings = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Storage unavailable
    }
    const defaults = getDefaults(scheme)
    setSettings(defaults)
  }, [storageKey, scheme])

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    clearSettings,
  }
}
