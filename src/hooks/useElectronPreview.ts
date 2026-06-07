import { useEffect, useCallback, useRef, useMemo } from 'react'
import { invoke, isTauri as checkIsTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

/**
 * Hook for communicating with Electron/Tauri to open/manage
 * a preview window of YouTube live chat with CSS injection.
 *
 * Automatically detects the runtime (Electron or Tauri) and uses the appropriate API.
 *
 * Provides `isElectron`, `isTauri` flags and preview control methods.
 */
export function useElectronPreview() {
  // Detect Tauri runtime INSIDE the hook (lazy), not at module load.
  // Tauri 2's init script sets `window.isTauri = true` via Object.defineProperty
  // before the page's own scripts run, but Vite module evaluation can happen
  // before the init script is applied in some webview timing scenarios.
  // Evaluating on first render guarantees the property is set.
  const isTauriRuntime = useMemo(() => checkIsTauri(), [])

  // Capture electronApi in a ref to keep a stable reference
  const electronApiRef = useRef<ElectronAPI | undefined>(window.electronAPI)

  // Derive isElectron after we know the Tauri state
  const isElectron = useMemo(
    () => !isTauriRuntime && window.electronAPI !== undefined,
    [isTauriRuntime]
  )

  // Subscribe to preview-closed events
  useEffect(() => {
    if (isElectron && electronApiRef.current) {
      const cleanup = electronApiRef.current.onPreviewClosed(() => {
        window.dispatchEvent(new CustomEvent('electron-preview-closed'))
      })
      return () => {
        cleanup?.()
      }
    } else if (isTauriRuntime) {
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
  }, [isElectron, isTauriRuntime])

  const openPreview = useCallback(
    async (videoId: string, css: string) => {
      if (isElectron && electronApiRef.current) {
        electronApiRef.current.openChatPreview(videoId, css)
      } else if (isTauriRuntime) {
        await invoke('open_preview_window', { videoId, css })
      }
    },
    [isElectron, isTauriRuntime]
  )

  const updateCSS = useCallback(
    async (css: string) => {
      if (isElectron && electronApiRef.current) {
        electronApiRef.current.updateChatCSS(css)
      } else if (isTauriRuntime) {
        await invoke('inject_css', { css })
      }
    },
    [isElectron, isTauriRuntime]
  )

  const closePreview = useCallback(() => {
    if (isElectron && electronApiRef.current) {
      electronApiRef.current.closeChatPreview()
    } else if (isTauriRuntime) {
      invoke('close_preview_window', {})
    }
  }, [isElectron, isTauriRuntime])

  return {
    isElectron,
    isTauri: isTauriRuntime,
    openPreview,
    updateCSS,
    closePreview,
  }
}
