import { useEffect, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

// Check if running in Tauri
const isTauri = window.__TAURI__ !== undefined

// Check if running in Electron
const isElectron = !isTauri && window.electronAPI !== undefined

/**
 * Hook for communicating with Electron/Tauri to open/manage
 * a preview window of YouTube live chat with CSS injection.
 *
 * Automatically detects the runtime (Electron or Tauri) and uses the appropriate API.
 *
 * Provides `isElectron`, `isTauri` flags and preview control methods.
 */
export function useElectronPreview() {
  // Capture electronApi in a ref to keep a stable reference (avoids
  // re-running effects/callbacks when the parent re-renders).
  const electronApiRef = useRef<ElectronAPI | undefined>(window.electronAPI)

  // Subscribe to preview-closed events
  useEffect(() => {
    if (isElectron && electronApiRef.current) {
      const cleanup = electronApiRef.current.onPreviewClosed(() => {
        window.dispatchEvent(new CustomEvent('electron-preview-closed'))
      })
      return () => {
        cleanup?.()
      }
    } else if (isTauri) {
      // Tauri event listener
      const unlistenPromise = listen('preview-closed', () => {
        window.dispatchEvent(new CustomEvent('electron-preview-closed'))
      })
      let unlisten: (() => void) | undefined
      unlistenPromise.then((fn) => {
        unlisten = fn
      })
      return () => {
        unlisten?.()
      }
    }
  }, [])

  const openPreview = useCallback(async (videoId: string, css: string) => {
    if (isElectron && electronApiRef.current) {
      electronApiRef.current.openChatPreview(videoId, css)
    } else if (isTauri) {
      await invoke('open_preview_window', { videoId, css })
    }
  }, [])

  const updateCSS = useCallback(async (css: string) => {
    if (isElectron && electronApiRef.current) {
      electronApiRef.current.updateChatCSS(css)
    } else if (isTauri) {
      await invoke('inject_css', { css })
    }
  }, [])

  const closePreview = useCallback(() => {
    if (isElectron && electronApiRef.current) {
      electronApiRef.current.closeChatPreview()
    } else if (isTauri) {
      invoke('close_preview_window', {})
    }
  }, [])

  return { isElectron, isTauri, openPreview, updateCSS, closePreview }
}
