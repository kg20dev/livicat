/**
 * useResponsive — Detect screen orientation and provide responsive utilities
 *
 * Features:
 * - Detect portrait vs landscape orientation
 * - Calculate aspect ratio
 * - Provide responsive breakpoint helpers
 */

import { useState, useEffect } from 'react'

export type Orientation = 'portrait' | 'landscape' | 'square'

export interface ResponsiveState {
  orientation: Orientation
  aspectRatio: number
  isPortrait: boolean
  isLandscape: boolean
  isSquare: boolean
  width: number
  height: number
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        orientation: 'landscape',
        aspectRatio: 16 / 9,
        isPortrait: false,
        isLandscape: true,
        isSquare: false,
        width: 1920,
        height: 1080,
      }
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const aspectRatio = width / height

    let orientation: Orientation
    if (aspectRatio < 0.9) {
      orientation = 'portrait'
    } else if (aspectRatio > 1.1) {
      orientation = 'landscape'
    } else {
      orientation = 'square'
    }

    return {
      orientation,
      aspectRatio,
      isPortrait: orientation === 'portrait',
      isLandscape: orientation === 'landscape',
      isSquare: orientation === 'square',
      width,
      height,
    }
  })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const aspectRatio = width / height

      let orientation: Orientation
      if (aspectRatio < 0.9) {
        orientation = 'portrait'
      } else if (aspectRatio > 1.1) {
        orientation = 'landscape'
      } else {
        orientation = 'square'
      }

      setState({
        orientation,
        aspectRatio,
        isPortrait: orientation === 'portrait',
        isLandscape: orientation === 'landscape',
        isSquare: orientation === 'square',
        width,
        height,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return state
}
