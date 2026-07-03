/* eslint-disable react-refresh/only-export-components */
// This file intentionally exports both a Provider component and a use* hook.
// Splitting them would require a separate file for the hook's context type.
// The react-refresh warning is a known cosmetic limitation — no runtime impact.

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export interface OBSSettings {
  obsUrl?: string // e.g. ws://localhost:4455
  obsPassword?: string
  sourceName?: string // default "Livicat Chat"
  defaultScene?: string
}

const STORE_KEY = 'livicat-obs-settings'
const defaultSettings: OBSSettings = {
  obsUrl: '',
  obsPassword: '',
  sourceName: 'Livicat Chat',
  defaultScene: '',
}

interface OBSContextValue {
  settings: OBSSettings
  isLoading: boolean
  error: string | null
  saveSettings: (newSettings: OBSSettings) => Promise<void>
  resetSettings: () => void
  isConfigured: () => boolean
  setSettings: React.Dispatch<React.SetStateAction<OBSSettings>>
}

const OBSContext = createContext<OBSContextValue | null>(null)

function loadFromStorage(): OBSSettings {
  try {
    const stored = localStorage.getItem(STORE_KEY)
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore parse errors
  }
  return defaultSettings
}

/**
 * Provider that loads OBS settings from localStorage once and shares
 * them across all consumers via React Context — single source of truth.
 */
export function OBSProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<OBSSettings>(loadFromStorage)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mark loading complete after first render (state is already populated)
  useEffect(() => {
    setIsLoading(false)
  }, [])

  const saveSettings = useCallback(async (newSettings: OBSSettings) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(newSettings))
      setSettings(newSettings)
    } catch (e) {
      console.error('[OBSProvider] Save error', e)
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

  return (
    <OBSContext.Provider
      value={{
        settings,
        isLoading,
        error,
        saveSettings,
        resetSettings,
        isConfigured,
        setSettings,
      }}
    >
      {children}
    </OBSContext.Provider>
  )
}

/**
 * Hook that reads OBS settings from the nearest OBSProvider.
 * Falls back to localStorage if no provider is found (legacy support).
 */
export function useOBSSettings(): OBSContextValue {
  const ctx = useContext(OBSContext)

  // Hooks must be called unconditionally (rules-of-hooks).
  // These are only used as fallback when no OBSProvider is present.
  const [fallbackSettings, setFallbackSettings] = useState<OBSSettings>(loadFromStorage)
  const [isLoading] = useState(false)
  const [error] = useState<string | null>(null)

  const saveSettings = useCallback(async (newSettings: OBSSettings) => {
    localStorage.setItem(STORE_KEY, JSON.stringify(newSettings))
    setFallbackSettings(newSettings)
  }, [])

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORE_KEY)
    setFallbackSettings(defaultSettings)
  }, [])

  const isConfigured = useCallback((): boolean => {
    return Boolean(
      fallbackSettings.obsUrl?.startsWith('ws://') || fallbackSettings.obsUrl?.startsWith('wss://')
    )
  }, [fallbackSettings.obsUrl])

  if (ctx) return ctx

  return {
    settings: fallbackSettings,
    isLoading,
    error,
    saveSettings,
    resetSettings,
    isConfigured,
    setSettings: setFallbackSettings,
  }
}
