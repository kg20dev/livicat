import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useThemeSettings } from '../useThemeSettings'
import type { SettingDef } from '../../theme/types'

const mockScheme: SettingDef[] = [
  { key: 'messageBg', type: 'color', label: 'Background', default: '#1a1a1a' },
  { key: 'fontSize', type: 'range', label: 'Font Size', min: 10, max: 48, default: 14, unit: 'px' },
  { key: 'showAvatars', type: 'toggle', label: 'Show Avatars', default: true },
  {
    key: 'animationSpeed',
    type: 'select',
    label: 'Animation',
    default: 'normal',
    options: [
      { value: 'none', label: 'None' },
      { value: 'slow', label: 'Slow' },
      { value: 'normal', label: 'Normal' },
    ],
  },
]

const TEST_KEY = 'livicat_test_theme'

describe('useThemeSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults from scheme on mount with no stored data', () => {
    const { result } = renderHook(() => useThemeSettings(TEST_KEY, mockScheme))
    expect(result.current.settings).toEqual({
      messageBg: '#1a1a1a',
      fontSize: 14,
      showAvatars: true,
      animationSpeed: 'normal',
    })
  })

  it('loads stored settings from localStorage', () => {
    localStorage.setItem(
      TEST_KEY,
      JSON.stringify({
        messageBg: '#ffffff',
        fontSize: 20,
        showAvatars: false,
        animationSpeed: 'slow',
      })
    )
    const { result } = renderHook(() => useThemeSettings(TEST_KEY, mockScheme))
    expect(result.current.settings.messageBg).toBe('#ffffff')
    expect(result.current.settings.fontSize).toBe(20)
    expect(result.current.settings.showAvatars).toBe(false)
    expect(result.current.settings.animationSpeed).toBe('slow')
  })

  it('merges stored settings with defaults for missing keys', () => {
    localStorage.setItem(TEST_KEY, JSON.stringify({ messageBg: '#ffffff' }))
    const { result } = renderHook(() => useThemeSettings(TEST_KEY, mockScheme))
    expect(result.current.settings.messageBg).toBe('#ffffff')
    expect(result.current.settings.fontSize).toBe(14) // default
    expect(result.current.settings.showAvatars).toBe(true) // default
  })

  it('persists settings to localStorage on update', () => {
    const { result } = renderHook(() => useThemeSettings(TEST_KEY, mockScheme))
    act(() => {
      result.current.updateSetting('fontSize', 24)
    })
    expect(result.current.settings.fontSize).toBe(24)
    const stored = JSON.parse(localStorage.getItem(TEST_KEY)!)
    expect(stored.fontSize).toBe(24)
  })

  it('resets settings to defaults and clears localStorage', () => {
    localStorage.setItem(
      TEST_KEY,
      JSON.stringify({
        messageBg: '#ffffff',
        fontSize: 40,
        showAvatars: false,
        animationSpeed: 'none',
      })
    )
    const { result } = renderHook(() => useThemeSettings(TEST_KEY, mockScheme))
    act(() => {
      result.current.resetSettings()
    })
    expect(result.current.settings).toEqual({
      messageBg: '#1a1a1a',
      fontSize: 14,
      showAvatars: true,
      animationSpeed: 'normal',
    })
    const stored = localStorage.getItem(TEST_KEY)
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.fontSize).toBe(14)
  })

  it('clearSettings removes localStorage and restores defaults', () => {
    localStorage.setItem(
      TEST_KEY,
      JSON.stringify({
        messageBg: '#ffffff',
        fontSize: 40,
        showAvatars: false,
        animationSpeed: 'none',
      })
    )
    const { result } = renderHook(() => useThemeSettings(TEST_KEY, mockScheme))
    act(() => {
      result.current.clearSettings()
    })
    expect(result.current.settings).toEqual({
      messageBg: '#1a1a1a',
      fontSize: 14,
      showAvatars: true,
      animationSpeed: 'normal',
    })
    expect(localStorage.getItem(TEST_KEY)).toBeNull()
  })

  it('handles corrupted JSON gracefully', () => {
    localStorage.setItem(TEST_KEY, 'not-json')
    const { result } = renderHook(() => useThemeSettings(TEST_KEY, mockScheme))
    expect(result.current.settings).toEqual({
      messageBg: '#1a1a1a',
      fontSize: 14,
      showAvatars: true,
      animationSpeed: 'normal',
    })
  })

  it('multiple settings can be updated independently', () => {
    const { result } = renderHook(() => useThemeSettings(TEST_KEY, mockScheme))
    act(() => {
      result.current.updateSetting('messageBg', '#ff0000')
    })
    act(() => {
      result.current.updateSetting('fontSize', 20)
    })
    act(() => {
      result.current.updateSetting('showAvatars', false)
    })
    expect(result.current.settings.messageBg).toBe('#ff0000')
    expect(result.current.settings.fontSize).toBe(20)
    expect(result.current.settings.showAvatars).toBe(false)
    expect(result.current.settings.animationSpeed).toBe('normal') // unchanged
  })

  it('different storageKeys do not interfere', () => {
    const keyA = 'livicat_test_a'
    const keyB = 'livicat_test_b'
    const { result: hookA } = renderHook(() => useThemeSettings(keyA, mockScheme))
    const { result: hookB } = renderHook(() => useThemeSettings(keyB, mockScheme))

    act(() => {
      hookA.current.updateSetting('messageBg', '#aaa')
    })
    act(() => {
      hookB.current.updateSetting('messageBg', '#bbb')
    })

    expect(hookA.current.settings.messageBg).toBe('#aaa')
    expect(hookB.current.settings.messageBg).toBe('#bbb')
  })
})
