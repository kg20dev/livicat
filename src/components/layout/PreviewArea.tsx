import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import ChatPreview, { type Message } from '../chat/ChatPreview'
import ChatIframe from '../chat/ChatIframe'
import type { ChatIframeError } from '../chat/ChatIframe'
import ErrorBoundary from '../ui/ErrorBoundary'
import LiveBadge from '../ui/LiveBadge'
import UrlInputBar, { type ChatMode } from '../ui/UrlInputBar'
import ControlButtons from '../ui/ControlButtons'
import { validateYouTubeUrl } from '../../utils/youtubeValidation'

/* ─── Context ────────────────────────────────────────────────────── */

interface PreviewAreaContext {
  messages: Message[]
  mode: ChatMode
  activeTab: string
  url: string
  videoId: string | null
  urlError: string | null
  isEmpty: boolean
  injectedCSS: string
  iframeError: ChatIframeError | null
  onTabChange: (tab: string) => void
  onUrlChange: (url: string) => void
  onFetch: () => void
  onRandomize: () => void
  onToggle: () => void
  onIframeError: (error: ChatIframeError) => void
  onSwitchToTesting: () => void
}

const PreviewAreaContext = createContext<PreviewAreaContext | null>(null)

function usePreviewAreaContext() {
  const ctx = useContext(PreviewAreaContext)
  if (!ctx) throw new Error('PreviewArea compound components must be used within <PreviewArea>')
  return ctx
}

/* ─── Root ────────────────────────────────────────────────────────── */

interface PreviewAreaRootProps {
  messages?: Message[]
  mode?: ChatMode
  activeTab?: string
  url?: string
  injectedCSS?: string
  onTabChange?: (tab: string) => void
  onUrlChange?: (url: string) => void
  onFetch?: () => void
  onRandomize?: () => void
  onToggle?: () => void
  children: React.ReactNode
  className?: string
}

export default function PreviewArea({
  messages = [],
  mode = 'live',
  activeTab = 'Live/Past Video',
  url = '',
  injectedCSS = '',
  onTabChange = () => {},
  onUrlChange = () => {},
  onFetch = () => {},
  onRandomize = () => {},
  onToggle = () => {},
  children,
  className = '',
}: PreviewAreaRootProps) {
  // Track iframe-level errors for fallback UX
  const [iframeError, setIframeError] = useState<ChatIframeError | null>(null)

  // Determine if chat should be empty (no URL in live mode)
  const isEmpty = mode === 'live' && !url

  // Validate the YouTube URL
  const validation = useMemo(() => validateYouTubeUrl(url), [url])
  const urlError = validation.isValid || !url ? null : (validation.errorMessage ?? null)

  // Use validated videoId when the URL is valid
  const videoId = validation.isValid ? validation.videoId : null

  // Handle iframe errors
  const onIframeError = useCallback((error: ChatIframeError) => {
    setIframeError(error)
  }, [])

  // Fallback: switch to testing/demo mode
  const onSwitchToTesting = useCallback(() => {
    setIframeError(null)
    onTabChange('Testing Mode')
  }, [onTabChange])

  const contextValue: PreviewAreaContext = {
    messages,
    mode,
    activeTab,
    url,
    videoId,
    urlError,
    isEmpty,
    injectedCSS,
    iframeError,
    onTabChange,
    onUrlChange,
    onFetch,
    onRandomize,
    onToggle,
    onIframeError,
    onSwitchToTesting,
  }

  return (
    <PreviewAreaContext.Provider value={contextValue}>
      <section
        className={`flex-1 chat-preview-container flex flex-col items-center justify-center p-container-margin relative ${className}`}
      >
        {children}
      </section>
    </PreviewAreaContext.Provider>
  )
}

/* ─── Sub-components ──────────────────────────────────────────────── */

PreviewArea.ToolBar = function PreviewAreaToolBar() {
  const { mode, activeTab, url, onTabChange, onUrlChange, onFetch } = usePreviewAreaContext()

  return (
    <div className="absolute top-4 left-6 flex items-center gap-3 z-10">
      <UrlInputBar
        mode={mode}
        activeTab={activeTab}
        url={url}
        onTabChange={onTabChange}
        onUrlChange={onUrlChange}
        onFetch={onFetch}
      >
        <UrlInputBar.Tabs />
        <UrlInputBar.InputSection />
      </UrlInputBar>
    </div>
  )
}

PreviewArea.LiveBadge = function PreviewAreaLiveBadge() {
  return <LiveBadge className="right-6 left-auto" />
}

PreviewArea.Chat = function PreviewAreaChat() {
  const { messages, mode, videoId, urlError, isEmpty, injectedCSS, onIframeError } =
    usePreviewAreaContext()

  // Live mode with valid video ID → show the actual YouTube iframe
  if (mode === 'live' && videoId) {
    return (
      <ErrorBoundary onError={(err) => onIframeError({ type: 'unknown', message: err.message })}>
        <ChatIframe videoId={videoId} injectedCSS={injectedCSS} onError={onIframeError} />
      </ErrorBoundary>
    )
  }

  // Live mode with URL but invalid → show URL error
  if (mode === 'live' && urlError) {
    return (
      <div className="w-full max-w-[400px] h-[600px] glass-panel rounded-xl shadow-2xl flex flex-col items-center justify-center p-6">
        <span className="material-symbols-outlined text-warning text-[48px] mb-4">link_off</span>
        <p className="text-body-md text-on-surface font-bold text-center mb-2">
          Invalid YouTube URL
        </p>
        <p className="text-label-md text-on-surface-variant text-center max-w-[280px] whitespace-pre-line">
          {urlError}
        </p>
      </div>
    )
  }

  // Testing mode or no valid video ID → show the preview
  return (
    <ChatPreview messages={messages} isEmpty={isEmpty}>
      <ChatPreview.Header />
      <ChatPreview.Messages />
    </ChatPreview>
  )
}

PreviewArea.Actions = function PreviewAreaActions() {
  const { onRandomize, onToggle, iframeError, onSwitchToTesting } = usePreviewAreaContext()

  return (
    <div className="absolute bottom-6 right-6 flex items-center gap-2">
      {iframeError && (
        <button
          onClick={onSwitchToTesting}
          className="bg-surface-container-lowest border border-outline-variant py-2 px-4 rounded-lg text-label-md font-bold hover:bg-surface-container transition-colors"
        >
          Demo Mode
        </button>
      )}
      <ControlButtons onRandomize={onRandomize} onToggle={onToggle}>
        <ControlButtons.Randomize />
        <ControlButtons.Toggle />
      </ControlButtons>
    </div>
  )
}

export type { PreviewAreaRootProps, ChatMode }
