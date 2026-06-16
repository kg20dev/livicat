import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSidebarCollapsed } from '../useSidebarCollapsed'

describe('useSidebarCollapsed', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should initialize as expanded by default', () => {
    const { result } = renderHook(() => useSidebarCollapsed())

    expect(result.current.isCollapsed).toBe(false)
  })

  it('should toggle collapsed state', () => {
    const { result } = renderHook(() => useSidebarCollapsed())

    expect(result.current.isCollapsed).toBe(false)

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isCollapsed).toBe(true)

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isCollapsed).toBe(false)
  })

  it('should set collapsed state explicitly', () => {
    const { result } = renderHook(() => useSidebarCollapsed())

    act(() => {
      result.current.setCollapsed(true)
    })

    expect(result.current.isCollapsed).toBe(true)

    act(() => {
      result.current.setCollapsed(false)
    })

    expect(result.current.isCollapsed).toBe(false)
  })

  it('should persist state to localStorage', () => {
    const { result } = renderHook(() => useSidebarCollapsed())

    act(() => {
      result.current.toggle()
    })

    expect(localStorage.getItem('livicat_sidebar_collapsed')).toBe('true')

    act(() => {
      result.current.toggle()
    })

    expect(localStorage.getItem('livicat_sidebar_collapsed')).toBe('false')
  })

  it('should restore state from localStorage', () => {
    localStorage.setItem('livicat_sidebar_collapsed', 'true')

    const { result } = renderHook(() => useSidebarCollapsed())

    expect(result.current.isCollapsed).toBe(true)
  })

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw errors
    const originalSetItem = localStorage.setItem
    localStorage.setItem = () => {
      throw new Error('localStorage is full')
    }

    const { result } = renderHook(() => useSidebarCollapsed())

    // Should not throw, just log warning
    act(() => {
      result.current.toggle()
    })

    expect(result.current.isCollapsed).toBe(true)

    // Restore original
    localStorage.setItem = originalSetItem
  })
})
