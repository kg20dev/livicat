const STORAGE_KEYS = {
  API_KEY: 'livicat_api_key',
  CHAT_SETTINGS: 'livicat_chat_settings',
} as const

/**
 * Retrieve the stored API key from localStorage.
 * Returns null if no key is stored or storage is unavailable.
 */
export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.API_KEY)
  } catch {
    return null
  }
}

/**
 * Persist an API key to localStorage.
 * Silently handles storage errors (quota exceeded, disabled storage).
 */
export function storeApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key)
  } catch {
    // Storage full, disabled, or in private mode
  }
}

/**
 * Remove the stored API key from localStorage.
 */
export function clearStoredApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.API_KEY)
  } catch {
    // Ignore
  }
}

/**
 * Check if a string looks like a valid YouTube API key.
 * YouTube Data API v3 keys start with "AIzaSy" and are 39 characters long.
 */
export function isValidApiKeyFormat(key: string): boolean {
  return /^AIzaSy[0-9A-Za-z_-]{33}$/.test(key)
}

/**
 * Check whether an API key is currently stored in localStorage.
 */
export function hasStoredApiKey(): boolean {
  return getStoredApiKey() !== null
}
