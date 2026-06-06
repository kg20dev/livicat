import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useChatSettings, DEFAULT_SETTINGS } from '../useChatSettings'

describe('useChatSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('initialization', () => {
    it('loads default settings when nothing is stored', () => {
      const { result } = renderHook(() => useChatSettings())
      expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
    })

    it('loads stored settings from localStorage', () => {
      const stored = {
        ...DEFAULT_SETTINGS,
        showAvatars: false,
        fontFamily: 'Arial, sans-serif',
      }
      localStorage.setItem('livicat_chat_settings', JSON.stringify(stored))

      const { result } = renderHook(() => useChatSettings())
      expect(result.current.settings.showAvatars).toBe(false)
      expect(result.current.settings.fontFamily).toBe('Arial, sans-serif')
    })

    it('merges stored settings with defaults for missing fields', () => {
      localStorage.setItem(
        'livicat_chat_settings',
        JSON.stringify({ showAvatars: false, messageFontSize: 18 })
      )

      const { result } = renderHook(() => useChatSettings())
      expect(result.current.settings.showAvatars).toBe(false)
      expect(result.current.settings.messageFontSize).toBe(18)
      expect(result.current.settings.maxMessages).toBe(DEFAULT_SETTINGS.maxMessages)
    })

    it('falls back to defaults when stored JSON is invalid', () => {
      localStorage.setItem('livicat_chat_settings', 'not-json')

      const { result } = renderHook(() => useChatSettings())
      expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
    })
  })

  describe('updateSetting', () => {
    it('updates a single setting', () => {
      const { result } = renderHook(() => useChatSettings())

      act(() => {
        result.current.updateSetting('showAvatars', false)
      })

      expect(result.current.settings.showAvatars).toBe(false)
      expect(result.current.settings.maxMessages).toBe(DEFAULT_SETTINGS.maxMessages) // unchanged
    })

    it('persists to localStorage on update', () => {
      const { result } = renderHook(() => useChatSettings())

      act(() => {
        result.current.updateSetting('messageFontSize', 20)
      })

      const stored = JSON.parse(localStorage.getItem('livicat_chat_settings')!)
      expect(stored.messageFontSize).toBe(20)
    })

    it('shows saved indicator briefly', () => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useChatSettings())

      expect(result.current.savedIndicator).toBe(false)

      act(() => {
        result.current.updateSetting('messageFontSize', 18)
      })

      expect(result.current.savedIndicator).toBe(true)

      act(() => {
        vi.advanceTimersByTime(1500)
      })

      expect(result.current.savedIndicator).toBe(false)
      vi.useRealTimers()
    })
  })

  describe('updateSettings (batch)', () => {
    it('updates multiple settings at once', () => {
      const { result } = renderHook(() => useChatSettings())

      act(() => {
        result.current.updateSettings({
          showAvatars: false,
          showTimestamps: false,
          messageFontSize: 16,
        })
      })

      expect(result.current.settings.showAvatars).toBe(false)
      expect(result.current.settings.showTimestamps).toBe(false)
      expect(result.current.settings.messageFontSize).toBe(16)
      expect(result.current.settings.maxMessages).toBe(DEFAULT_SETTINGS.maxMessages) // unchanged
    })
  })

  describe('presets', () => {
    it('applies a preset correctly', () => {
      const { result } = renderHook(() => useChatSettings())

      act(() => {
        result.current.applyPreset('minimal')
      })

      // Check a few key preset values
      expect(result.current.settings.showAvatars).toBe(false)
      expect(result.current.settings.showTimestamps).toBe(false)
      expect(result.current.settings.messageSpacing).toBe('compact')
    })

    it('does nothing for unknown preset names', () => {
      const { result } = renderHook(() => useChatSettings())

      act(() => {
        result.current.applyPreset('nonexistent')
      })

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
    })

    it('persists preset to localStorage', () => {
      const { result } = renderHook(() => useChatSettings())

      act(() => {
        result.current.applyPreset('compact')
      })

      const stored = JSON.parse(localStorage.getItem('livicat_chat_settings')!)
      expect(stored.messageSpacing).toBe('compact')
    })
  })

  describe('resetToDefaults', () => {
    it('resets all settings to defaults', () => {
      const { result } = renderHook(() => useChatSettings())

      act(() => {
        result.current.updateSetting('showAvatars', false)
        result.current.updateSetting('messageFontSize', 24)
        result.current.updateSetting('usernameColor', '#ff0000')
      })

      expect(result.current.settings.showAvatars).toBe(false)

      act(() => {
        result.current.resetToDefaults()
      })

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
    })

    it('persists reset to localStorage', () => {
      const { result } = renderHook(() => useChatSettings())

      act(() => {
        result.current.updateSetting('maxMessages', 999)
      })

      act(() => {
        result.current.resetToDefaults()
      })

      const stored = JSON.parse(localStorage.getItem('livicat_chat_settings')!)
      expect(stored.maxMessages).toBe(DEFAULT_SETTINGS.maxMessages)
    })
  })

  describe('export / import', () => {
    it('exports settings as JSON string', () => {
      const { result } = renderHook(() => useChatSettings())

      const exported = result.current.exportSettings()
      const parsed = JSON.parse(exported)

      expect(parsed).toEqual(DEFAULT_SETTINGS)
    })

    it('imports valid JSON settings', () => {
      const { result } = renderHook(() => useChatSettings())

      const newSettings = { ...DEFAULT_SETTINGS, fontFamily: 'Comic Sans', messageFontSize: 24 }

      act(() => {
        const success = result.current.importSettings(JSON.stringify(newSettings))
        expect(success).toBe(true)
      })

      expect(result.current.settings.fontFamily).toBe('Comic Sans')
      expect(result.current.settings.messageFontSize).toBe(24)
    })

    it('fills missing fields with defaults on import', () => {
      const { result } = renderHook(() => useChatSettings())

      act(() => {
        result.current.importSettings(JSON.stringify({ fontFamily: 'Arial' }))
      })

      expect(result.current.settings.fontFamily).toBe('Arial')
      expect(result.current.settings.maxMessages).toBe(DEFAULT_SETTINGS.maxMessages)
    })

    it('returns false for invalid JSON on import', () => {
      const { result } = renderHook(() => useChatSettings())

      let success: boolean
      act(() => {
        success = result.current.importSettings('not-json')
      })

      // @ts-expect-error - success was set in act
      expect(success).toBe(false)
    })

    it('returns false for non-object JSON on import', () => {
      const { result } = renderHook(() => useChatSettings())

      let success: boolean
      act(() => {
        success = result.current.importSettings('"just a string"')
      })

      // @ts-expect-error - success was set in act
      expect(success).toBe(false)
      expect(result.current.settings).toEqual(DEFAULT_SETTINGS) // unchanged
    })
  })

  describe('localStorage error handling', () => {
    it('handles localStorage errors gracefully on update', () => {
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage full')
      })

      const { result } = renderHook(() => useChatSettings())

      act(() => {
        result.current.updateSetting('messageFontSize', 18)
      })

      expect(result.current.settings.messageFontSize).toBe(18)

      localStorage.setItem = originalSetItem
    })
  })

  describe('presets list', () => {
    it('exposes all presets', () => {
      const { result } = renderHook(() => useChatSettings())
      expect(Array.isArray(result.current.presets)).toBe(true)
      expect(result.current.presets.length).toBeGreaterThan(0)

      // Each preset has the required fields
      for (const preset of result.current.presets) {
        expect(preset).toHaveProperty('name')
        expect(preset).toHaveProperty('label')
        expect(preset).toHaveProperty('description')
        expect(preset).toHaveProperty('settings')
      }
    })
  })
})
