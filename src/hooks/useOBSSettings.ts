import { useState, useEffect, useCallback } from 'react'

export interface OBSSettings {
  obsUrl?: string           // e.g. ws://localhost:4455
  obsPassword?: string
  sourceName?: string       // default "Livicat Chat"
  defaultScene?: string
}

const STORE_KEY = 'livicat-obs-settings'
const defaultSettings: OBSSettings = {
  obsUrl: '',
  obsPassword: '',
  sourceName: 'Livicat Chat',
  defaultScene: '',
}

/**
 * Simple hook for persisting OBS settings in localStorage.
 * This avoids the need for @tauri-apps/plugin-store which would require additional
 * native bindings. The UI can later be upgraded to use the store when the app ships.
 */
export function useOBSSettings() {
  const [settings, setSettings] = useState<OBSSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load once on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as OBSSettings
        setSettings({ ...defaultSettings, ...parsed })
      } catch (e) {
        console.error('[useOBSSettings] Failed to parse stored settings', e)
        setError('Corrupt settings data')
      }
    }
    setIsLoading(false)
  }, [])

  const saveSettings = useCallback(async (newSettings: OBSSettings) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(newSettings))
      setSettings(newSettings)
      // Broadcast change for any open windows
      window.dispatchEvent(new CustomEvent('obs-settings-changed', { detail: newSettings }))
    } catch (e) {
      console.error('[useOBSSettings] Save error', e)
      setError('Failed to save settings')
      throw e
    }
  }, [])

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORE_KEY)
    setSettings(defaultSettings)
  }, [])

  const isConfigured = useCallback((): boolean => {
    return Boolean(settings.obsUrl?.startsWith('ws://') || settings.obsUrl?.startsWith('wss://'))
  }, [settings.obsUrl])

  return {
    settings,
    isLoading,
    error,
    saveSettings,
    resetSettings,
    isConfigured,
    setSettings,
  }
}
