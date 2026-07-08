import React from 'react'
import { useOBSSettings } from '../../hooks/useOBSSettings'
import { useStreamContext } from '../../hooks/useStreamState'
import { TauriService } from '../../services/TauriService'
import { OBSConnectionPanel } from '../layout/OBSConnectionPanel'

interface StreamSenderProps {
  videoId: string | null
  injectedCSS: string
  hideAtsign: boolean
}

export function StreamSender({ videoId, injectedCSS, hideAtsign }: StreamSenderProps) {
  const { settings, isConfigured } = useOBSSettings()
  const { streamState, startStream, stopStream, pushCssUpdate } = useStreamContext()
  const [showSetup, setShowSetup] = React.useState(false)
  const [toastMsg, setToastMsg] = React.useState('')
  const [toastError, setToastError] = React.useState(false)

  // ── Renderer health check ──────────────────────────────────────
  const [rendererAlive, setRendererAlive] = React.useState(false)

  React.useEffect(() => {
    if (streamState !== 'websocket') {
      setRendererAlive(false)
      return
    }
    const check = async () => {
      const alive = await TauriService.checkRendererHealth()
      setRendererAlive(alive)
    }
    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [streamState])

  const showToast = (msg: string, isError = false) => {
    setToastMsg(msg)
    setToastError(isError)
    setTimeout(() => {
      setToastMsg('')
      setToastError(false)
    }, 4000)
  }

  // ── Stream actions (delegated to shared context) ────────────────

  const handleSendToStream = async (overrideSettings?: typeof settings) => {
    if (!videoId) {
      console.warn('[StreamSender] handleSendToStream: no videoId')
      return
    }

    const s = overrideSettings ?? settings

    // If OBS is not configured, show setup modal
    if (!s.obsUrl || !(s.obsUrl.startsWith('ws://') || s.obsUrl.startsWith('wss://'))) {
      console.log('[StreamSender] OBS not configured, showing setup modal')
      setShowSetup(true)
      return
    }

    console.log('[StreamSender] Calling startStream', {
      videoId,
      cssLen: injectedCSS.length,
      hideAtsign,
    })
    const { ok, message } = await startStream(videoId, injectedCSS, hideAtsign, overrideSettings)
    console.log('[StreamSender] startStream result:', { ok, message })
    showToast(message, !ok)
  }

  const handleStopStream = async () => {
    const { message } = await stopStream()
    showToast(message)
  }

  // ── Live CSS update: push theme changes to active stream ──────

  React.useEffect(() => {
    console.log(
      '[StreamSender] css effect fired (cssLen=%d, streamState=%s)',
      injectedCSS.length,
      streamState
    )
    let cancelled = false
    const doPush = async () => {
      const sent = await pushCssUpdate(injectedCSS)
      console.log('[StreamSender] pushCssUpdate returned sent=%s, cancelled=%s', sent, cancelled)
      if (sent && !cancelled) {
        console.log('[StreamSender] showing CSS toast')
        showToast('CSS pushed to OBS')
      }
    }
    doPush()
    return () => {
      cancelled = true
    }
    // Only re-run when CSS content or stream state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectedCSS, streamState])

  // ── Button rendering ─────────────────────────────────────────

  const buttonDisabled = !videoId || streamState === 'sending' || streamState === 'stopping'

  const getButtonContent = () => {
    if (streamState === 'sending' || streamState === 'stopping') {
      return (
        <>
          <span className="w-4 h-4 border-2 border-on-accent border-t-transparent rounded-full animate-spin" />
          {streamState === 'stopping' ? 'Stopping' : 'Sending'}
        </>
      )
    }
    if (streamState === 'websocket') {
      return (
        <>
          <span className="material-symbols-outlined text-[18px]">close</span>
          Stop Stream
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
    if (streamState === 'websocket') {
      handleStopStream()
    } else if (streamState === 'idle') {
      handleSendToStream()
    }
  }

  const getTitle = () => {
    if (!videoId) return 'Load a video first'
    if (streamState === 'websocket') return 'Remove browser source from OBS/PRISM'
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
        {/* Renderer health indicator */}
        {streamState === 'websocket' && (
          <span
            className={`w-2 h-2 rounded-full transition-colors ${
              rendererAlive ? 'bg-success' : 'bg-error'
            }`}
            title={rendererAlive ? 'Renderer connected' : 'Renderer unreachable'}
          />
        )}
        {/* Single contextual button */}
        <button
          onClick={handleButtonClick}
          disabled={buttonDisabled}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-sm font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
            streamState === 'websocket'
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
    </>
  )
}
