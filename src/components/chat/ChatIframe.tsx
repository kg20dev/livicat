import { useEffect, useRef, useState, useCallback } from 'react'

/* ─── Constants ──────────────────────────────────────────────────── */

/** How long to wait before considering the iframe load as timed out (ms) */
const IFRAME_TIMEOUT = 30_000

/* ─── Types ──────────────────────────────────────────────────────── */

export type ChatIframeError =
  | { type: 'load_failed'; message: string }
  | { type: 'timeout'; message: string }
  | { type: 'cross_origin'; message: string }
  | { type: 'injection_failed'; message: string }
  | { type: 'unknown'; message: string }

interface ChatIframeProps {
  videoId: string
  injectedCSS?: string
  /** Timeout in ms before considering the iframe unresponsive */
  timeout?: number
  onLoad?: () => void
  onError?: (error: ChatIframeError) => void
  onRetry?: () => void
  className?: string
}

/* ─── Error Display ─────────────────────────────────────────────── */

function getErrorDisplay(
  error: ChatIframeError,
  onRetry: () => void,
  onSwitchToDemo: () => void
): React.ReactElement {
  const icon = 'error_outline'
  let title: string
  let description: string

  switch (error.type) {
    case 'timeout':
      title = 'Chat is taking too long to load'
      description =
        'The YouTube chat is not responding. This may happen if the video is not a livestream or does not have chat enabled.'
      break
    case 'cross_origin':
      title = 'Chat preview unavailable'
      description =
        'YouTube blocks direct access to the chat content. For OBS, use the generated CSS file instead.'
      break
    case 'load_failed':
      title = 'Failed to load chat'
      description =
        'The YouTube chat could not be loaded. The video may be private, deleted, or chat may not be available for this video.'
      break
    case 'injection_failed':
      title = 'Styling issue detected'
      description =
        'Custom styles could not be applied. The chat will still work with default styling.'
      break
    default:
      title = 'Something went wrong'
      description = 'An unexpected error occurred. Please try again.'
  }

  return (
    <div className="w-full max-w-[400px] h-[600px] glass-panel rounded-xl shadow-2xl flex flex-col items-center justify-center p-6">
      <span className="material-symbols-outlined text-error text-[48px] mb-4">{icon}</span>
      <p className="text-body-md text-on-surface font-bold text-center mb-2">{title}</p>
      <p className="text-label-md text-on-surface-variant text-center mb-6 max-w-[280px]">
        {description}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="bg-primary text-on-primary py-2 px-6 rounded-lg font-bold hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
        <button
          onClick={onSwitchToDemo}
          className="bg-surface-container-lowest border border-outline-variant py-2 px-6 rounded-lg font-bold hover:bg-surface-container transition-colors"
        >
          Demo Mode
        </button>
      </div>
    </div>
  )
}

/* ─── Component ──────────────────────────────────────────────────── */

export default function ChatIframe({
  videoId,
  injectedCSS = '',
  timeout = IFRAME_TIMEOUT,
  onLoad,
  onError,
  onRetry,
  className = '',
}: ChatIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ChatIframeError | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Reset state when videoId changes
  useEffect(() => {
    if (!videoId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    setRetryCount(0)
  }, [videoId])

  // Start / clear timeout
  useEffect(() => {
    if (!videoId || !isLoading) return

    timeoutRef.current = setTimeout(() => {
      const timeoutError: ChatIframeError = {
        type: 'timeout',
        message: 'YouTube chat iframe failed to load within the timeout period',
      }
      setError(timeoutError)
      setIsLoading(false)
      onError?.(timeoutError)
    }, timeout)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [videoId, isLoading, timeout, onError])

  // Handle iframe load and error events
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !videoId) return

    const handleLoad = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setIsLoading(false)
      onLoad?.()
    }

    const handleIframeError = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      const loadError: ChatIframeError = {
        type: 'load_failed',
        message: 'YouTube chat iframe failed to load',
      }
      setError(loadError)
      setIsLoading(false)
      onError?.(loadError)
    }

    iframe.addEventListener('load', handleLoad)
    iframe.addEventListener('error', handleIframeError)

    return () => {
      iframe.removeEventListener('load', handleLoad)
      iframe.removeEventListener('error', handleIframeError)
    }
  }, [videoId, onLoad, onError])

  // Inject CSS into iframe when it loads
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !videoId || !injectedCSS || error) return

    const injectCSS = () => {
      try {
        const doc = iframe.contentWindow?.document
        if (!doc) {
          console.warn('Cannot access iframe document (cross-origin)')
          return
        }

        const existingStyle = doc.head.querySelector('#injected-chat-css')
        if (existingStyle) {
          doc.head.removeChild(existingStyle)
        }

        const styleElement = doc.createElement('style')
        styleElement.id = 'injected-chat-css'
        styleElement.textContent = injectedCSS
        doc.head.appendChild(styleElement)
      } catch {
        const crossOriginError: ChatIframeError = {
          type: 'cross_origin',
          message: 'Cannot inject CSS into YouTube iframe due to cross-origin restrictions',
        }
        setError(crossOriginError)
        onError?.(crossOriginError)
      }
    }

    iframe.addEventListener('load', injectCSS, { once: true })

    return () => {
      iframe.removeEventListener('load', injectCSS)
    }
  }, [videoId, injectedCSS, onError, error])

  // Retry handler: re-mount the iframe by incrementing retry count
  const handleRetry = useCallback(() => {
    setRetryCount((prev) => prev + 1)
    setError(null)
    setIsLoading(true)
    onRetry?.()
  }, [onRetry])

  // Switch to demo mode handler
  const handleSwitchToDemo = useCallback(() => {
    // The parent can listen for this through the onError callback
    // and switch to testing mode
    onError?.({ type: 'unknown', message: 'User switched to demo mode' })
  }, [onError])

  // If no videoId, show empty state
  if (!videoId) {
    return (
      <div
        className={`w-full max-w-[400px] h-[600px] glass-panel rounded-xl shadow-2xl flex flex-col items-center justify-center ${className}`}
      >
        <span className="material-symbols-outlined text-outline text-[48px] mb-4">chat_bubble</span>
        <p className="text-body-md text-on-surface-variant text-center">
          Enter a YouTube URL to load chat
        </p>
      </div>
    )
  }

  // Show error state with retry / demo buttons
  if (error) {
    return getErrorDisplay(error, handleRetry, handleSwitchToDemo)
  }

  // Show loading state
  if (isLoading) {
    return (
      <div
        className={`w-full max-w-[400px] h-[600px] glass-panel rounded-xl shadow-2xl flex flex-col items-center justify-center ${className}`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-label-md text-on-surface-variant">Loading chat...</p>
        </div>
      </div>
    )
  }

  // Render iframe (keyed by retryCount to force re-mount on retry)
  return (
    <iframe
      key={retryCount}
      ref={iframeRef}
      src={`https://www.youtube.com/live_chat?v=${videoId}`}
      className={`w-full max-w-[400px] h-[600px] glass-panel rounded-xl shadow-2xl overflow-hidden ${className}`}
      title="YouTube Live Chat"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      referrerPolicy="no-referrer-when-downgrade"
    />
  )
}
