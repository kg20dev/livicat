/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react'
import { TauriService } from '../services/TauriService'
import { useOBSSettings, type OBSSettings } from './useOBSSettings'
import { trackEventAsync } from '../utils/analytics'

export type StreamState = 'idle' | 'sending' | 'stopping' | 'websocket'

interface StreamContextValue {
  /** Current stream state — the single source of truth for all stream UI */
  streamState: StreamState
  /**
   * Start streaming chat to OBS.
   * Returns null on failure, or a result string on success.
   * Handles OBS WebSocket setup, renderer launch, and browser source creation.
   */
  startStream: (
    videoId: string,
    injectedCSS: string,
    hideAtsign: boolean,
    overrideSettings?: OBSSettings
  ) => Promise<{ ok: boolean; message: string }>
  /** Stop the active stream — stops renderer, closes WebView, removes OBS source. */
  stopStream: () => Promise<{ ok: boolean; message: string }>
  /**
   * Push a CSS update to the active renderer (live theme change).
   * No-op if no stream is active. Deduplicates identical CSS strings.
   */
  pushCssUpdate: (css: string) => void
}

const StreamContext = createContext<StreamContextValue | null>(null)

export function StreamProvider({ children }: { children: ReactNode }) {
  const { settings } = useOBSSettings()
  const [streamState, setStreamState] = useState<StreamState>('idle')

  // Keep a ref to latest OBS settings so async handlers don't stale
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // Renderer port — used for live CSS updates
  const chatPortRef = useRef<number | null>(null)

  // Track last-sent CSS to avoid redundant POSTs
  const prevCssRef = useRef('')

  // Keep streamState in a ref so pushCssUpdate never has stale deps
  const streamStateRef = useRef(streamState)
  streamStateRef.current = streamState

  const startStream = useCallback(
    async (
      videoId: string,
      injectedCSS: string,
      hideAtsign: boolean,
      overrideSettings?: OBSSettings
    ): Promise<{ ok: boolean; message: string }> => {
      const s = overrideSettings ?? settingsRef.current

      // Validate OBS configuration
      if (!s.obsUrl || !(s.obsUrl.startsWith('ws://') || s.obsUrl.startsWith('wss://'))) {
        return { ok: false, message: 'OBS not configured' }
      }

      setStreamState('sending')

      try {
        console.log('[StreamProvider] Calling startChat', { videoId, cssLen: injectedCSS.length, hideAtsign })
        const chatPort = await TauriService.startChat(videoId, injectedCSS, hideAtsign)
        console.log('[StreamProvider] startChat returned', chatPort)

        if (!chatPort) {
          console.error('[StreamProvider] startChat returned null — chat engine failed')
          setStreamState('idle')
          return { ok: false, message: 'Failed to start chat engine' }
        }

        chatPortRef.current = chatPort

        const proxyUrl = `http://localhost:${chatPort}`
        console.log('[StreamProvider] Calling sendBrowserSource...')
        const result = await TauriService.sendBrowserSource({
          obsUrl: s.obsUrl,
          obsPassword: s.obsPassword,
          videoId,
          css: injectedCSS,
          sourceName: s.sourceName || 'Livicat Chat',
          sceneName: s.defaultScene || undefined,
          proxyUrl,
        })
        console.log('[StreamProvider] sendBrowserSource returned', result)

        if (result === 'created' || result === 'updated') {
          setStreamState('websocket')
          // Track last sent CSS so pushCssUpdate can skip duplicates
          prevCssRef.current = injectedCSS
          trackEventAsync('stream_sent_headless', {
            mode: result,
            port: chatPort,
          })
          const label = result === 'created' ? 'streaming' : 'updated'
          return { ok: true, message: `Livicat chat ${label} to OBS!` }
        }

        // OBS browser source creation failed — clean up chat engine
        await TauriService.stopChat()
        chatPortRef.current = null
        setStreamState('idle')
        return { ok: false, message: 'Failed to create browser source in OBS' }
      } catch (err) {
        console.error('[StreamProvider] Stream failed with exception:', err)
        setStreamState('idle')
        return { ok: false, message: 'Failed to start stream' }
      }
    },
    []
  )

  const stopStream = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    setStreamState('stopping')

    const s = settingsRef.current

    try {
      await TauriService.stopChat()
      chatPortRef.current = null

      const ok = await TauriService.removeBrowserSource(
        s.obsUrl || '',
        s.obsPassword,
        s.sourceName || 'Livicat Chat'
      )

      setStreamState('idle')
      trackEventAsync('stream_stopped', { mode: 'headless' })

      if (ok) {
        return { ok: true, message: 'Livicat chat stopped' }
      } else {
        return { ok: true, message: 'Livicat chat stopped (source already gone)' }
      }
    } catch (err) {
      console.error('[StreamProvider] Stop stream failed with exception:', err)
      setStreamState('idle')
      chatPortRef.current = null
      return { ok: false, message: 'Failed to stop stream' }
    }
  }, [])

  const pushCssUpdate = useCallback((css: string) => {
    if (!chatPortRef.current || streamStateRef.current !== 'websocket') {
      prevCssRef.current = css
      return
    }
    if (css === prevCssRef.current) return
    prevCssRef.current = css
    TauriService.updateRendererCss(css)
  }, [])

  return (
    <StreamContext.Provider
      value={{ streamState, startStream, stopStream, pushCssUpdate }}
    >
      {children}
    </StreamContext.Provider>
  )
}

export function useStreamContext(): StreamContextValue {
  const ctx = useContext(StreamContext)
  if (!ctx) {
    throw new Error('useStreamContext must be used within a StreamProvider')
  }
  return ctx
}
