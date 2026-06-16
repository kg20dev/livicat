/**
 * useSidebarFloating — Manage floating sidebar state with persistence
 *
 * Features:
 * - Persist floating visibility state in localStorage
 * - Provide toggle function for show/hide
 * - Initialize from localStorage on mount
 * - Default to hidden (floating sidebar is an overlay)
 */

import { useState, useCallback } from 'react'

const STORAGE_KEY = 'livicat_sidebar_visible'

export function useSidebarCollapsed() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      // Default to collapsed (hidden) when floating
      return stored !== 'true'
    } catch {
      return true
    }
  })

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev
      const isVisible = !newValue
      try {
        localStorage.setItem(STORAGE_KEY, String(isVisible))
      } catch (error) {
        console.warn('[useSidebarFloating] Failed to persist state:', error)
      }
      return newValue
    })
  }, [])

  const setCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(() => {
      const isVisible = !collapsed
      try {
        localStorage.setItem(STORAGE_KEY, String(isVisible))
      } catch (error) {
        console.warn('[useSidebarFloating] Failed to persist state:', error)
      }
      return collapsed
    })
  }, [])

  return { isCollapsed, toggle, setCollapsed }
}
