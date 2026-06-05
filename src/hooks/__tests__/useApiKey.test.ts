import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useApiKey } from '../useApiKey'
import { storeApiKey } from '../../utils/storage'

describe('useApiKey', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes with empty key when nothing is stored', () => {
    const { result } = renderHook(() => useApiKey())
    expect(result.current.apiKey).toBe('')
    expect(result.current.keySaved).toBe(false)
  })

  it('loads a stored key from localStorage on mount', () => {
    storeApiKey('AIzaSySavedKey123456789012345678901234567')
    const { result } = renderHook(() => useApiKey())
    expect(result.current.apiKey).toBe('AIzaSySavedKey123456789012345678901234567')
    expect(result.current.keySaved).toBe(true)
  })

  it('persists key to localStorage when setApiKey is called', () => {
    const { result } = renderHook(() => useApiKey())

    act(() => {
      result.current.setApiKey('AIzaSyNewKey123456789012345678901234567')
    })

    expect(result.current.apiKey).toBe('AIzaSyNewKey123456789012345678901234567')
    expect(result.current.keySaved).toBe(true)
    expect(localStorage.getItem('livicat_api_key')).toBe('AIzaSyNewKey123456789012345678901234567')
  })

  it('clears key from localStorage when clearSavedKey is called', () => {
    storeApiKey('AIzaSySavedKey123456789012345678901234567')
    const { result } = renderHook(() => useApiKey())

    act(() => {
      result.current.clearSavedKey()
    })

    expect(result.current.apiKey).toBe('')
    expect(result.current.keySaved).toBe(false)
    expect(localStorage.getItem('livicat_api_key')).toBeNull()
  })

  it('clears storage when setApiKey is called with empty string', () => {
    storeApiKey('AIzaSySavedKey123456789012345678901234567')
    const { result } = renderHook(() => useApiKey())

    act(() => {
      result.current.setApiKey('')
    })

    expect(result.current.apiKey).toBe('')
    expect(result.current.keySaved).toBe(false)
    expect(localStorage.getItem('livicat_api_key')).toBeNull()
  })

  it('provides stable references for callbacks', () => {
    const { result, rerender } = renderHook(() => useApiKey())

    const setApiKey1 = result.current.setApiKey
    const clearSavedKey1 = result.current.clearSavedKey

    rerender()

    expect(result.current.setApiKey).toBe(setApiKey1)
    expect(result.current.clearSavedKey).toBe(clearSavedKey1)
  })
})
