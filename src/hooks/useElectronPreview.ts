import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook for communicating with Electron's main process to open/manage
 * a native BrowserWindow preview of YouTube live chat with CSS injection.
 *
 * Provides `isElectron` flag and preview control methods.
 * Falls back gracefully when running in a regular browser.
 */
export function useElectronPreview() {
  const api = window.electronAPI
  const isElectron = !!api
  const cleanupRef = useRef<(() => void) | null>(null)

  // Subscribe to preview-closed events
  useEffect(() => {
    if (!api) return
    cleanupRef.current = api.onPreviewClosed(() => {
      // Notify components that preview was closed
      window.dispatchEvent(new CustomEvent('electron-preview-closed'))
    })
    return () => {
      cleanupRef.current?.()
    }
  }, [api])

  const openPreview = useCallback(
    (videoId: string, css: string) => {
      api?.openChatPreview(videoId, css)
    },
    [api]
  )

  const updateCSS = useCallback(
    (css: string) => {
      api?.updateChatCSS(css)
    },
    [api]
  )

  const closePreview = useCallback(() => {
    api?.closeChatPreview()
  }, [api])

  return { isElectron, openPreview, updateCSS, closePreview }
}
