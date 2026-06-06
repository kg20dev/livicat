import { useEffect, useRef, useState } from 'react'

/* ─── Types ──────────────────────────────────────────────────────── */

interface ChatIframeProps {
  videoId: string
  injectedCSS?: string
  onLoad?: () => void
  onError?: (error: Error) => void
  className?: string
}

/* ─── Component ──────────────────────────────────────────────────── */

export default function ChatIframe({
  videoId,
  injectedCSS = '',
  onLoad,
  onError,
  className = '',
}: ChatIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Reset loading state when videoId changes
  useEffect(() => {
    if (!videoId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setHasError(false)
  }, [videoId])

  // Inject CSS into iframe when it loads
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !videoId || !injectedCSS) return

    const injectCSS = () => {
      try {
        const doc = iframe.contentWindow?.document
        if (!doc) {
          console.warn('Cannot access iframe document (cross-origin)')
          return
        }

        // Remove existing style element if present
        const existingStyle = doc.head.querySelector('#injected-chat-css')
        if (existingStyle) {
          doc.head.removeChild(existingStyle)
        }

        // Create new style element
        const styleElement = doc.createElement('style')
        styleElement.id = 'injected-chat-css'
        styleElement.textContent = injectedCSS

        // Append to head
        doc.head.appendChild(styleElement)

        console.log('CSS injected successfully into iframe')
      } catch (error) {
        console.error('Failed to inject CSS into iframe:', error)
        onError?.(error as Error)
      }
    }

    // Inject CSS after iframe loads
    iframe.addEventListener('load', injectCSS, { once: true })

    return () => {
      iframe.removeEventListener('load', injectCSS)
    }
  }, [videoId, injectedCSS, onError])

  // Handle iframe load
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !videoId) return

    const handleLoad = () => {
      setIsLoading(false)
      onLoad?.()
    }

    const handleError = () => {
      setIsLoading(false)
      setHasError(true)
      onError?.(new Error('Failed to load YouTube chat'))
    }

    iframe.addEventListener('load', handleLoad)
    iframe.addEventListener('error', handleError)

    return () => {
      iframe.removeEventListener('load', handleLoad)
      iframe.removeEventListener('error', handleError)
    }
  }, [videoId, onLoad, onError])

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

  // Show error state
  if (hasError) {
    return (
      <div
        className={`w-full max-w-[400px] h-[600px] glass-panel rounded-xl shadow-2xl flex flex-col items-center justify-center ${className}`}
      >
        <span className="material-symbols-outlined text-error text-[48px] mb-4">error_outline</span>
        <p className="text-body-md text-on-surface-variant text-center">
          Failed to load YouTube chat
        </p>
      </div>
    )
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

  // Render iframe
  return (
    <iframe
      ref={iframeRef}
      src={`https://www.youtube.com/live_chat?v=${videoId}`}
      className={`w-full max-w-[400px] h-[600px] glass-panel rounded-xl shadow-2xl overflow-hidden ${className}`}
      title="YouTube Live Chat"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      referrerPolicy="no-referrer-when-downgrade"
    />
  )
}
