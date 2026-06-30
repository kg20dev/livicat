import { useState } from 'react'
import { TauriService } from '../../services/TauriService'
import { useOBSSettings } from '../../hooks/useOBSSettings'
import { trackEventAsync } from '../../utils/analytics'
import { OBSConnectionPanel } from '../layout/OBSConnectionPanel'

interface StreamSenderProps {
  videoId: string | null
  injectedCSS: string
}

export function StreamSender({ videoId, injectedCSS }: StreamSenderProps) {
  const { settings, isConfigured } = useOBSSettings()
  const [showSetup, setShowSetup] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [toastMsg, setToastMsg] = useState('')
  const [httpPort, setHttpPort] = useState<number | null>(null)

  const showToast = (msg: string, isError = false) => {
    setToastMsg(msg)
    setStatus(isError ? 'error' : 'success')
    setTimeout(() => {
      setStatus('idle')
      setToastMsg('')
    }, 4000)
  }

  const handleSendToStream = async () => {
    if (!videoId) return
    
    // If not configured at all (URL is totally empty), show setup
    if (!settings.obsUrl && settings.obsUrl !== '') {
      setShowSetup(true)
      return
    }

    setStatus('sending')
    
    // 1. If user provided a URL, try WebSocket
    if (isConfigured()) {
      const result = await TauriService.sendBrowserSource({
        obsUrl: settings.obsUrl!,
        obsPassword: settings.obsPassword,
        videoId,
        css: injectedCSS,
        sourceName: settings.sourceName || 'Livicat Chat'
      })
      
      if (result === 'created') {
        showToast('Source added to OBS/PRISM!')
        trackEventAsync('stream_sent_websocket', { mode: 'create' })
        return
      } else if (result === 'updated') {
        showToast('Source CSS updated in OBS/PRISM!')
        trackEventAsync('stream_sent_websocket', { mode: 'update' })
        return
      }
      
      // If WebSocket fails but was configured, we warn them but still try HTTP
      console.warn('[StreamSender] WebSocket failed, falling back to HTTP')
    }

    // 2. HTTP Fallback Path
    const port = await TauriService.startChatServer(videoId, injectedCSS)
    if (port) {
      setHttpPort(port)
      showToast(`Started HTTP fallback on port ${port}`)
      trackEventAsync('stream_sent_http', { port })
    } else {
      showToast('Failed to connect to streaming app', true)
    }
  }

  if (showSetup) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center backdrop-blur-sm">
        <OBSConnectionPanel 
          onConnected={() => {
            setShowSetup(false)
            handleSendToStream()
          }} 
          onCancel={() => setShowSetup(false)} 
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={() => {
          if (!settings.obsUrl && settings.obsUrl !== '') setShowSetup(true)
          else handleSendToStream()
        }}
        disabled={!videoId || status === 'sending'}
        className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-on-accent px-4 py-2 rounded-full text-label-md font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'sending' ? (
          <span className="w-4 h-4 border-2 border-on-accent border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="material-symbols-outlined text-[20px]">
            {isConfigured() ? 'broadcast_on_personal' : 'cast'}
          </span>
        )}
        Send to Stream
      </button>

      {/* Connection Quick-Edit link */}
      <button 
        onClick={() => setShowSetup(true)}
        className="text-[10px] text-on-surface-variant hover:text-on-surface underline mr-2"
      >
        {isConfigured() ? 'Configure OBS' : 'Configure Stream'}
      </button>

      {/* Feedback Toast */}
      {status !== 'idle' && status !== 'sending' && (
        <div className={`absolute bottom-[100%] right-0 mb-3 px-3 py-2 rounded-lg shadow-xl border text-label-sm whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 ${
          status === 'error' 
            ? 'bg-error/20 border-error/30 text-error-container' 
            : 'bg-success/20 border-success/30 text-success'
        }`}>
          {toastMsg}
        </div>
      )}

      {/* HTTP Fallback UI */}
      {httpPort && status !== 'error' && !isConfigured() && (
        <div className="absolute bottom-[100%] right-0 mb-12 w-[320px] p-4 glass-panel border border-outline rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-label-md font-bold text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">dns</span>
              Manual OBS Source
            </h4>
            <button onClick={() => setHttpPort(null)} className="text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
          <p className="text-body-sm text-on-surface-variant mb-3 leading-snug">
            Add a new Browser Source in your streaming app and paste this exact URL:
          </p>
          <div className="flex items-center gap-2 bg-surface p-2 rounded-lg border border-outline">
            <code className="text-[11px] font-mono text-primary flex-1 overflow-x-auto whitespace-nowrap">
              http://localhost:{httpPort}
            </code>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`http://localhost:${httpPort}`)
                showToast('URL Copied!')
              }}
              className="w-6 h-6 flex items-center justify-center bg-surface-variant rounded text-on-surface hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
