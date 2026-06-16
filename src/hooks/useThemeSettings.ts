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

function loadSettings(storageKey: string, scheme: SettingDef[], appVersion: string): ThemeSettings {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      const storedVersion = localStorage.getItem(`${storageKey}${VERSION_KEY}`)

      // If version mismatch or no version stored → migrate
      if (storedVersion !== appVersion) {
        return migrateSettings(parsed, scheme)
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
    loadSettings(storageKey, scheme, fallbackVersion)
  )
  const [appVersion, setAppVersion] = useState<string>(fallbackVersion)
  const [versionLoaded, setVersionLoaded] = useState(false)

  // Load app version from Rust on mount
  useEffect(() => {
    let mounted = true
    getAppVersion().then((version) => {
      if (mounted) {
        setAppVersion(version)
        setVersionLoaded(true)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Reload settings when real version loads (if different from fallback)
  useEffect(() => {
    if (!versionLoaded) return
    if (appVersion !== fallbackVersion) {
      const loaded = loadSettings(storageKey, scheme, appVersion)
      setSettings(loaded)
    }
  }, [storageKey, scheme, appVersion, versionLoaded, fallbackVersion])

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
