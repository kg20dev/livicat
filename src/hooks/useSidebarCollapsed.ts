/**
 * useSidebarCollapsed — Manage sidebar collapsed state with persistence
 *
 * Features:
 * - Persist collapsed state in localStorage
 * - Provide toggle function
 * - Initialize from localStorage on mount
 */

import { useState, useCallback } from 'react'

const STORAGE_KEY = 'livicat_sidebar_collapsed'

export function useSidebarCollapsed() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored === 'true'
    } catch {
      return false
    }
  })

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(newValue))
      } catch (error) {
        console.warn('[useSidebarCollapsed] Failed to persist state:', error)
      }
      return newValue
    })
  }, [])

  const setCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(() => {
      try {
        localStorage.setItem(STORAGE_KEY, String(collapsed))
      } catch (error) {
        console.warn('[useSidebarCollapsed] Failed to persist state:', error)
      }
      return collapsed
    })
  }, [])

  return { isCollapsed, toggle, setCollapsed }
}
