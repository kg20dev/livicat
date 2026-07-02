/**
 * useThemeSettings — Generic scoped settings hook for themes
 *
 * Each theme gets its own localStorage key for complete isolation.
 * Switching themes never cross-contaminates settings.
 */

import { useState, useCallback, useEffect } from 'react'
import type { ThemeSettings } from '../theme/types'
import type { SettingDef } from '../theme/types'
import { TauriService } from '../services/TauriService'

const VERSION_KEY = '__livicat_settings_version__'

/* ─── Internal: load from localStorage ─────────────────────────── */

async function getAppVersion(): Promise<string> {
  // Try to get version from Rust binary via Tauri
  const version = await TauriService.getAppVersion()
  if (version) return version
  // Fallback for web/dev mode — read from package.json at build time
  return import.meta.env.VITE_APP_VERSION || '0.0.0'
}

function loadSettings(storageKey: string, scheme: SettingDef[]): ThemeSettings {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw)

      // Merge stored values onto defaults to catch any keys added after settings were saved.
      // Every scheme key is guaranteed to have a value; user overrides take priority.
      const defaults = getDefaults(scheme)
      return { ...defaults, ...migrateSettings(parsed, scheme) }
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

function saveSettings(storageKey: string, settings: ThemeSettings, appVersion: string): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings))
    localStorage.setItem(`${storageKey}${VERSION_KEY}`, appVersion)
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
  // Load fallback version immediately for synchronous initial load
  const fallbackVersion = import.meta.env.VITE_APP_VERSION || '0.0.0'
  const [settings, setSettings] = useState<ThemeSettings>(() =>
    loadSettings(storageKey, scheme)
  )
  const [appVersion, setAppVersion] = useState<string>(fallbackVersion)

  // Load app version from Rust on mount
  useEffect(() => {
    let mounted = true
    getAppVersion().then((version) => {
      if (mounted) {
        setAppVersion(version)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Reload settings when storageKey changes (theme switch) or appVersion loads
  useEffect(() => {
    const loaded = loadSettings(storageKey, scheme)
    setSettings(loaded)
  }, [storageKey, scheme, appVersion])

  const updateSetting = useCallback(
    (key: string, value: string | number | boolean) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value }
        saveSettings(storageKey, next, appVersion)
        return next
      })
    },
    [storageKey, appVersion]
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
        saveSettings(storageKey, next, appVersion)
        return next
      })
    },
    [storageKey, appVersion]
  )

  const resetSettings = useCallback(() => {
    const defaults = getDefaults(scheme)
    setSettings(defaults)
    saveSettings(storageKey, defaults, appVersion)
  }, [storageKey, scheme, appVersion])

  const clearSettings = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
      localStorage.removeItem(`${storageKey}${VERSION_KEY}`)
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
