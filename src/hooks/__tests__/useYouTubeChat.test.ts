import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useChatSettings, PRESET_THEMES } from '../useYouTubeChat'

describe('useChatSettings', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('loads default settings when no stored settings exist', () => {
    const { result } = renderHook(() => useChatSettings())

    expect(result.current.settings).toEqual({
      showAvatars: true,
      showTimestamps: true,
      autoScroll: true,
      maxMessages: 100,
      fontSize: 14,
      theme: 'dark',
      messageSpacing: 'normal',
      usernameColor: '#d6baff', // Stitch primary
      bgOpacity: 100,
      animationSpeed: 'normal',
    })
  })

  it('loads settings from localStorage on mount', () => {
    const storedSettings = {
      showAvatars: false,
      showTimestamps: false,
      autoScroll: true,
      maxMessages: 150,
      fontSize: 16,
      theme: 'dark' as const,
      messageSpacing: 'compact' as const,
      usernameColor: '#ff0000',
      bgOpacity: 80,
      animationSpeed: 'slow' as const,
    }

    localStorage.setItem('livicat_chat_settings', JSON.stringify(storedSettings))

    const { result } = renderHook(() => useChatSettings())

    expect(result.current.settings).toEqual(storedSettings)
  })

  it('merges stored settings with defaults for missing fields', () => {
    const partialSettings = {
      showAvatars: false,
      fontSize: 18,
    }

    localStorage.setItem('livicat_chat_settings', JSON.stringify(partialSettings))

    const { result } = renderHook(() => useChatSettings())

    expect(result.current.settings.showAvatars).toBe(false)
    expect(result.current.settings.fontSize).toBe(18)
    expect(result.current.settings.maxMessages).toBe(100) // default value
    expect(result.current.settings.usernameColor).toBe('#d6baff') // Stitch primary
  })

  it('updates a single setting', () => {
    const { result } = renderHook(() => useChatSettings())

    act(() => {
      result.current.updateSetting('showAvatars', false)
    })

    expect(result.current.settings.showAvatars).toBe(false)
  })

  it('persists settings to localStorage on update', () => {
    const { result } = renderHook(() => useChatSettings())

    act(() => {
      result.current.updateSetting('fontSize', 20)
    })

    const stored = localStorage.getItem('livicat_chat_settings')
    expect(stored).toBeTruthy()

    if (stored) {
      const parsed = JSON.parse(stored)
      expect(parsed.fontSize).toBe(20)
    }
  })

  it('shows saved indicator briefly after update', () => {
    const { result } = renderHook(() => useChatSettings())

    expect(result.current.savedIndicator).toBe(false)

    act(() => {
      result.current.updateSetting('fontSize', 18)
    })

    expect(result.current.savedIndicator).toBe(true)
  })

  it('applies preset theme correctly', () => {
    const { result } = renderHook(() => useChatSettings())

    act(() => {
      result.current.applyPreset('minimal')
    })

    expect(result.current.settings).toEqual(PRESET_THEMES.minimal)
  })

  it('persists preset theme to localStorage', () => {
    const { result } = renderHook(() => useChatSettings())

    act(() => {
      result.current.applyPreset('compact')
    })

    const stored = localStorage.getItem('livicat_chat_settings')
    expect(stored).toBeTruthy()

    if (stored) {
      const parsed = JSON.parse(stored)
      expect(parsed.messageSpacing).toBe('compact')
      expect(parsed.fontSize).toBe(12)
    }
  })

  it('resets to defaults correctly', () => {
    const { result } = renderHook(() => useChatSettings())

    // Make some changes
    act(() => {
      result.current.updateSetting('showAvatars', false)
      result.current.updateSetting('fontSize', 24)
    })

    expect(result.current.settings.showAvatars).toBe(false)
    expect(result.current.settings.fontSize).toBe(24)

    // Reset
    act(() => {
      result.current.resetToDefaults()
    })

    expect(result.current.settings.showAvatars).toBe(true)
    expect(result.current.settings.fontSize).toBe(14)
  })

  it('persists reset to localStorage', () => {
    const { result } = renderHook(() => useChatSettings())

    // Make changes
    act(() => {
      result.current.updateSetting('maxMessages', 200)
    })

    // Reset
    act(() => {
      result.current.resetToDefaults()
    })

    const stored = localStorage.getItem('livicat_chat_settings')
    expect(stored).toBeTruthy()

    if (stored) {
      const parsed = JSON.parse(stored)
      expect(parsed.maxMessages).toBe(100)
    }
  })

  it('handles localStorage errors gracefully', () => {
    // Mock localStorage to throw error
    const originalSetItem = localStorage.setItem
    localStorage.setItem = vi.fn(() => {
      throw new Error('Storage full')
    })

    const { result } = renderHook(() => useChatSettings())

    // Should not throw error
    act(() => {
      result.current.updateSetting('fontSize', 18)
    })

    expect(result.current.settings.fontSize).toBe(18)

    // Restore original
    localStorage.setItem = originalSetItem
  })

  it('updates all settings independently', () => {
    const { result } = renderHook(() => useChatSettings())

    act(() => {
      result.current.updateSetting('showAvatars', false)
      result.current.updateSetting('showTimestamps', false)
      result.current.updateSetting('autoScroll', false)
      result.current.updateSetting('maxMessages', 200)
      result.current.updateSetting('fontSize', 16)
      result.current.updateSetting('messageSpacing', 'compact')
      result.current.updateSetting('usernameColor', '#ff0000')
      result.current.updateSetting('bgOpacity', 50)
      result.current.updateSetting('animationSpeed', 'slow')
    })

    expect(result.current.settings).toEqual({
      showAvatars: false,
      showTimestamps: false,
      autoScroll: false,
      maxMessages: 200,
      fontSize: 16,
      theme: 'dark',
      messageSpacing: 'compact',
      usernameColor: '#ff0000',
      bgOpacity: 50,
      animationSpeed: 'slow',
    })
  })
})
