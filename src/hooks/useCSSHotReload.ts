import { useRef, useEffect, useCallback } from 'react'
import { TauriService } from '../services/TauriService'
import { useOBSSettings } from './useOBSSettings'
import { trackEventAsync } from '../utils/analytics'

/**
 * Debounced CSS hot-reload hook for OBS/PRISM.
 *
 * Watches for changes to `injectedCSS` and sends updates to OBS via WebSocket
 * (idempotent `SetInputSettings` on the "Livicat Chat" Browser Source).
 *
 * Uses a 400ms debounce to avoid hammering the WebSocket during rapid theme
 * editing. Tracks hot-reload analytics for product metrics.
 */
export function useCSSHotReload(videoId: string | null, injectedCSS: string) {
  const { settings, isConfigured } = useOBSSettings()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSentRef = useRef<string>('')
  const unmountedRef = useRef(false)

  const sendUpdate = useCallback(async (css: string) => {
    if (!videoId || unmountedRef.current) return
    if (!isConfigured()) return
    if (!settings.obsUrl) return

    // Skip if CSS hasn't actually changed
    if (css === lastSentRef.current) return

    lastSentRef.current = css

    try {
      const result = await TauriService.sendBrowserSource({
        obsUrl: settings.obsUrl,
        obsPassword: settings.obsPassword,
        videoId,
        css,
        sourceName: settings.sourceName || 'Livicat Chat',
      })

      if (result === 'updated') {
        trackEventAsync('stream_css_hot_reload', { mode: 'websocket' })
        console.log('[CSSHotReload] Updated CSS in OBS')
      }
    } catch (err) {
      console.error('[CSSHotReload] Failed to update CSS:', err)
    }
  }, [videoId, settings, isConfigured])

  useEffect(() => {
    unmountedRef.current = false

    // Clear previous debounce timer
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // Debounce 400ms — won't fire if CSS settles before then
    timerRef.current = setTimeout(() => {
      sendUpdate(injectedCSS)
    }, 400)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [injectedCSS, sendUpdate])

  useEffect(() => {
    return () => {
      unmountedRef.current = true
    }
  }, [])
}
