import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResponsive } from '../useResponsive'

describe('useResponsive', () => {
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight

  afterEach(() => {
    // Restore original dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    })
  })

  it('should detect landscape orientation', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1080,
    })

    const { result } = renderHook(() => useResponsive())

    expect(result.current.orientation).toBe('landscape')
    expect(result.current.isLandscape).toBe(true)
    expect(result.current.isPortrait).toBe(false)
    expect(result.current.aspectRatio).toBeCloseTo(16 / 9)
  })

  it('should detect portrait orientation', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1200,
    })

    const { result } = renderHook(() => useResponsive())

    expect(result.current.orientation).toBe('portrait')
    expect(result.current.isPortrait).toBe(true)
    expect(result.current.isLandscape).toBe(false)
    expect(result.current.aspectRatio).toBeCloseTo(2 / 3)
  })

  it('should detect square orientation', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1000,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1000,
    })

    const { result } = renderHook(() => useResponsive())

    expect(result.current.orientation).toBe('square')
    expect(result.current.isSquare).toBe(true)
    expect(result.current.isPortrait).toBe(false)
    expect(result.current.isLandscape).toBe(false)
  })

  it('should update on window resize', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1080,
    })

    const { result } = renderHook(() => useResponsive())

    expect(result.current.orientation).toBe('landscape')

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current.orientation).toBe('portrait')
  })
})
