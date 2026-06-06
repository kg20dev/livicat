import { describe, it, expect, beforeEach } from 'vitest'
import {
  getStoredApiKey,
  storeApiKey,
  clearStoredApiKey,
  isValidApiKeyFormat,
  hasStoredApiKey,
} from '../storage'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getStoredApiKey / storeApiKey', () => {
    it('returns null when no key is stored', () => {
      expect(getStoredApiKey()).toBeNull()
    })

    it('stores and retrieves an API key', () => {
      storeApiKey('AIzaSyTestKey123456789012345678901234567')
      expect(getStoredApiKey()).toBe('AIzaSyTestKey123456789012345678901234567')
    })

    it('overwrites an existing key', () => {
      storeApiKey('AIzaSyFirstKey12345678901234567890123456')
      storeApiKey('AIzaSySecondKey1234567890123456789012345')
      expect(getStoredApiKey()).toBe('AIzaSySecondKey1234567890123456789012345')
    })

    it('returns null when localStorage is unavailable', () => {
      const originalGetItem = Storage.prototype.getItem
      Storage.prototype.getItem = () => {
        throw new Error('Storage unavailable')
      }
      expect(getStoredApiKey()).toBeNull()
      Storage.prototype.getItem = originalGetItem
    })

    it('handles setItem errors gracefully', () => {
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = () => {
        throw new Error('Quota exceeded')
      }
      expect(() => storeApiKey('test-key')).not.toThrow()
      Storage.prototype.setItem = originalSetItem
    })
  })

  describe('clearStoredApiKey', () => {
    it('removes a stored key', () => {
      storeApiKey('AIzaSyTestKey123456789012345678901234567')
      clearStoredApiKey()
      expect(getStoredApiKey()).toBeNull()
    })

    it('does not throw when no key is stored', () => {
      expect(() => clearStoredApiKey()).not.toThrow()
    })
  })

  describe('isValidApiKeyFormat', () => {
    it('accepts a valid 39-character YouTube API key', () => {
      const key = 'AIzaSy' + 'a'.repeat(33)
      expect(key).toHaveLength(39)
      expect(isValidApiKeyFormat(key)).toBe(true)
    })

    it('rejects keys that do not start with AIzaSy', () => {
      const key = 'BizaSy' + 'a'.repeat(33)
      expect(key).toHaveLength(39)
      expect(isValidApiKeyFormat(key)).toBe(false)
    })

    it('rejects keys that are too short', () => {
      expect(isValidApiKeyFormat('AIzaSyShort')).toBe(false)
    })

    it('rejects keys that are too long', () => {
      expect(isValidApiKeyFormat('AIzaSy' + 'a'.repeat(34))).toBe(false)
    })

    it('rejects empty strings', () => {
      expect(isValidApiKeyFormat('')).toBe(false)
    })

    it('allows underscore and dash characters', () => {
      const key = 'AIzaSy' + 'a'.repeat(10) + '-' + 'b'.repeat(11) + '_' + 'c'.repeat(10)
      expect(key).toHaveLength(39)
      expect(isValidApiKeyFormat(key)).toBe(true)
    })
  })

  describe('hasStoredApiKey', () => {
    it('returns false when no key is stored', () => {
      expect(hasStoredApiKey()).toBe(false)
    })

    it('returns true when a key is stored', () => {
      storeApiKey('AIzaSyTestKey123456789012345678901234567')
      expect(hasStoredApiKey()).toBe(true)
    })

    it('returns false after key is cleared', () => {
      storeApiKey('AIzaSyTestKey123456789012345678901234567')
      clearStoredApiKey()
      expect(hasStoredApiKey()).toBe(false)
    })
  })
})
