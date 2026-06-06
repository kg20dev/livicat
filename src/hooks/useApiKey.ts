import { useState, useCallback } from 'react'
import { getStoredApiKey, storeApiKey, clearStoredApiKey } from '../utils/storage'

/**
 * Hook for managing the YouTube API key with localStorage persistence.
 *
 * - Loads saved key from localStorage on mount
 * - Auto-saves to localStorage when key changes
 * - Provides clearSavedKey to remove the stored key
 */
export function useApiKey() {
  const [apiKey, setApiKeyState] = useState(() => getStoredApiKey() ?? '')
  const [keySaved, setKeySaved] = useState(() => getStoredApiKey() !== null)

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key)
    if (key) {
      storeApiKey(key)
      setKeySaved(true)
    } else {
      clearStoredApiKey()
      setKeySaved(false)
    }
  }, [])

  const clearSavedKey = useCallback(() => {
    clearStoredApiKey()
    setApiKeyState('')
    setKeySaved(false)
  }, [])

  return { apiKey, setApiKey, clearSavedKey, keySaved }
}
