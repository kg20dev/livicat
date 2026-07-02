import React from 'react'
import { TauriService } from '../../services/TauriService'
import { useOBSSettings, type OBSSettings } from '../../hooks/useOBSSettings'
import { trackEventAsync } from '../../utils/analytics'
import { OBSConnectionPanel } from '../layout/OBSConnectionPanel'

interface StreamSenderProps {
  videoId: string | null
  injectedCSS: string
  hideAtsign: boolean
}

type StreamState = 'idle' | 'sending' | 'stopping' | 'websocket' | 'http'

export function StreamSender({ videoId, injectedCSS, hideAtsign }: StreamSenderProps) {
  const { settings, isConfigured } = useOBSSettings()
  const [showSetup, setShowSetup] = React.useState(false)
  const [streamState, setStreamState] = React.useState<StreamState>('idle')
  const [toastMsg, setToastMsg] = React.useState('')
  const [toastError, setToastError] = React.useState(false)
  const [httpPort, setHttpPort] = React.useState<number | null>(null)
  const [httpDismissed, setHttpDismissed] = React.useState(false)

  // Keep a ref to the latest settings so handlers don't use stale closure
  const settingsRef = React.useRef(settings)
  settingsRef.current = settings

  // Track the renderer port so CSS changes can be live-updated via POST
  const chatPortRef = React.useRef<number | null>(null)

  const showToast = (msg: string, isError = false) => {
    setToastMsg(msg)
    setToastError(isError)
    setTimeout(() => {
      setToastMsg('')
      setToastError(false)
    }, 4000)
  }

  const handleSendToStream = async (overrideSettings?: OBSSettings) => {
    if (!videoId) return

    const s = overrideSettings ?? settingsRef.current

    // If not configured at all (no websocket URL saved), show setup
    if (!s.obsUrl || s.obsUrl === '') {
      setShowSetup(true)
      return
    }

    setStreamState('sending')

    try {
      // User explicitly chose HTTP fallback — skip WebSocket
      if (s.obsUrl === 'http-fallback') {
        const port = await TauriService.startChatServer(videoId, injectedCSS, hideAtsign)
        if (port) {
          setHttpPort(port)
          setHttpDismissed(false)
          setStreamState('http')
          showToast(`HTTP server started on port ${port}`)
          trackEventAsync('stream_sent_http', { port })
        } else {
          setStreamState('idle')
          showToast('Failed to start HTTP server', true)
        }
        return
      }

      // 1. Try WebSocket — using headless chat system
      if (s.obsUrl?.startsWith('ws://') || s.obsUrl?.startsWith('wss://')) {
        const chatPort = await TauriService.startChat(videoId, injectedCSS, hideAtsign)

        if (!chatPort) {
          setStreamState('idle')
          showToast('Failed to start chat engine', true)
          return
        }

        chatPortRef.current = chatPort

        const proxyUrl = `http://localhost:${chatPort}`
        const result = await TauriService.sendBrowserSource({
          obsUrl: s.obsUrl,
          obsPassword: s.obsPassword,
          videoId,
          css: injectedCSS,
          sourceName: s.sourceName || 'Livicat Chat',
          sceneName: s.defaultScene || undefined,
          proxyUrl,
        })

        if (result === 'created') {
          setStreamState('websocket')
          showToast('Livicat chat streaming to OBS!')
          trackEventAsync('stream_sent_headless', { mode: 'create', port: chatPort })
          return
        } else if (result === 'updated') {
          setStreamState('websocket')
          showToast('Livicat chat updated in OBS!')
          trackEventAsync('stream_sent_headless', { mode: 'update', port: chatPort })
          return
        }

        // Headless + OBS failed — clean up headless
        await TauriService.stopChat()
        console.warn('[StreamSender] Headless+WebSocket failed, falling back to HTTP')
      }

      // 2. HTTP Fallback Path
      const fallbackPort = await TauriService.startChatServer(videoId, injectedCSS, hideAtsign)
      if (fallbackPort) {
        setHttpPort(fallbackPort)
        setHttpDismissed(false)
        setStreamState('http')
        showToast(`HTTP server started on port ${fallbackPort}`)
        trackEventAsync('stream_sent_http', { port: fallbackPort })
      } else {
        setStreamState('idle')
        showToast('Failed to start HTTP server', true)
      }
    } catch (err) {
      console.error('[StreamSender] Stream failed with exception:', err)
      setStreamState('idle')
      showToast('Failed to start stream', true)
    }
  }

  const handleStopStream = async () => {
    // Signal visual feedback immediately before any async work
    setStreamState('stopping')

    const s = settingsRef.current

    try {
      if (streamState === 'websocket') {
        // Stop headless chat system (Chrome + processor + renderer)
        await TauriService.stopChat()

        chatPortRef.current = null

        // Remove OBS source
        const ok = await TauriService.removeBrowserSource(
          s.obsUrl || '',
          s.obsPassword,
          s.sourceName || 'Livicat Chat'
        )
        if (ok) {
          setStreamState('idle')
          showToast('Livicat chat stopped')
          trackEventAsync('stream_stopped', { mode: 'headless' })
        } else {
          // Even if removing fails (source already gone), reset state
          setStreamState('idle')
          showToast('Livicat chat stopped (source already gone)')
        }
      } else if (streamState === 'http') {
        const ok = await TauriService.stopChatServer()
        if (ok) {
          setHttpPort(null)
          setHttpDismissed(false)
          setStreamState('idle')
          showToast('HTTP server stopped')
          trackEventAsync('stream_stopped', { mode: 'http' })
        } else {
          setHttpPort(null)
          setHttpDismissed(false)
          setStreamState('idle')
          showToast('HTTP server stopped (or already stopped)')
        }
      }
    } catch (err) {
      console.error('[StreamSender] Stop stream failed with exception:', err)
      setStreamState('idle')
      chatPortRef.current = null
      showToast('Failed to stop stream', true)
    }
  }

  // ── Live CSS update: push theme changes to active stream ──────

  const prevCssRef = React.useRef(injectedCSS)
  React.useEffect(() => {
    if (!chatPortRef.current || streamState !== 'websocket') {
      prevCssRef.current = injectedCSS
      return
    }
    // Avoid sending the same CSS twice (initial mount)
    if (injectedCSS === prevCssRef.current) return
    prevCssRef.current = injectedCSS

    TauriService.updateRendererCss(injectedCSS)
  }, [injectedCSS, streamState])

  // ── Button rendering ─────────────────────────────────────────

  const buttonDisabled =
    !videoId ||
    streamState === 'sending' ||
    streamState === 'stopping'

  const getButtonContent = () => {
    if (streamState === 'sending' || streamState === 'stopping') {
      return (
        <>
          <span className="w-4 h-4 border-2 border-on-accent border-t-transparent rounded-full animate-spin" />
          {streamState === 'stopping' ? 'Stopping' : 'Sending'}
        </>
      )
    }
    if (streamState === 'websocket' || streamState === 'http') {
      return (
        <>
          <span className="material-symbols-outlined text-[18px]">close</span>
          {streamState === 'websocket' ? 'Stop Stream' : 'Stop Server'}
        </>
      )
    }
    // idle
    return (
      <>
        <span className="material-symbols-outlined text-[18px]">
          {isConfigured() ? 'broadcast_on_personal' : 'add_circle'}
        </span>
        {isConfigured() ? 'Stream' : 'Configure OBS'}
      </>
    )
  }

  const handleButtonClick = () => {
    if (!videoId) return
    if (streamState === 'websocket' || streamState === 'http') {
      handleStopStream()
    } else if (streamState === 'idle') {
      handleSendToStream()
    }
  }

  const getTitle = () => {
    if (!videoId) return 'Load a video first'
    if (streamState === 'websocket') return 'Remove browser source from OBS/PRISM'
    if (streamState === 'http') return 'Stop HTTP server'
    if (isConfigured()) return 'Send chat to OBS/PRISM as a browser source'
    return 'Configure OBS WebSocket connection'
  }

  // ── Setup modal ──────────────────────────────────────────────

  if (showSetup) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center backdrop-blur-sm">
        <OBSConnectionPanel
          onConnected={(newSettings) => {
            setShowSetup(false)
            handleSendToStream(newSettings)
          }}
          onCancel={() => setShowSetup(false)}
        />
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────

  const showGear = streamState === 'idle' && isConfigured()

  return (
    <>
      <div className="flex items-center gap-1 shrink-0">
        {/* Single contextual button */}
        <button
          onClick={handleButtonClick}
          disabled={buttonDisabled}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-sm font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
            streamState === 'websocket' || streamState === 'http'
              ? 'bg-error hover:bg-error/80 text-on-error'
              : 'bg-accent hover:bg-accent-hover text-on-accent'
          }`}
          title={getTitle()}
        >
          {getButtonContent()}
        </button>

        {/* Gear icon for quick scene reconfiguration */}
        {showGear && (
          <button
            onClick={() => setShowSetup(true)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors shrink-0"
            title="Reconfigure OBS scene and connection"
          >
            <span className="material-symbols-outlined text-[16px]">settings</span>
          </button>
        )}
      </div>

      {/* Feedback Toast - fixed top-right */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-[9998]">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border text-label-sm font-medium animate-in fade-in slide-in-from-top-2 ${
              toastError
                ? 'bg-error/20 border-error/30 text-error'
                : 'bg-success/20 border-success/30 text-success'
            }`}
          >
            {toastMsg}
          </div>
        </div>
      )}

      {/* HTTP Fallback badge — compact inline chip */}
      {httpPort && streamState === 'http' && !httpDismissed && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-surface/90 border border-outline rounded-lg shadow animate-in fade-in slide-in-from-top-1 shrink-0">
          <span className="material-symbols-outlined text-[12px] text-primary shrink-0">dns</span>
          <code className="text-[10px] font-mono text-on-surface truncate max-w-[130px]">
            http://localhost:{httpPort}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`http://localhost:${httpPort}`)
              showToast('URL Copied!')
            }}
            className="w-5 h-5 flex items-center justify-center text-on-surface-variant hover:text-primary rounded shrink-0"
            title="Copy URL"
          >
            <span className="material-symbols-outlined text-[12px]">content_copy</span>
          </button>
          <span className="w-px h-3 bg-outline-variant/50" />
          <button
            onClick={() => setHttpDismissed(true)}
            className="w-5 h-5 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded shrink-0"
            title="Dismiss"
          >
            <span className="material-symbols-outlined text-[12px]">close</span>
          </button>
        </div>
      )}
    </>
  )
}
