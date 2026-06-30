import { createContext, useContext, useMemo, useCallback, useState, useEffect, useRef } from 'react'
import ChatPreview, { type Message } from '../chat/ChatPreview'
import UrlInputBar, { type ChatMode } from '../ui/UrlInputBar'
import { validateYouTubeUrl } from '../../utils/youtubeValidation'
import { useElectronPreview } from '../../hooks/useElectronPreview'
import type { YouTubeVideoInfo } from '../../utils/youtubeMetadata'
import { trackEventAsync } from '../../utils/analytics'
import { StreamSender } from '../ui/StreamSender'

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

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
  videoInfo: YouTubeVideoInfo | null
  fetchStatus: FetchStatus
  fetchError: string | null
  onTabChange: (tab: string) => void
  onUrlChange: (url: string) => void
  onFetch: () => void
  onRetryFetch: () => void
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
  submittedUrl?: string
  videoInfo?: YouTubeVideoInfo | null
  fetchStatus?: FetchStatus
  fetchError?: string | null
  injectedCSS?: string
  onTabChange?: (tab: string) => void
  onUrlChange?: (url: string) => void
  onFetch?: () => void
  children: React.ReactNode
  className?: string
}

export default function PreviewArea({
  messages = [],
  mode = 'live',
  activeTab = 'Live/Past Video',
  url = '',
  submittedUrl = '',
  videoInfo = null,
  fetchStatus = 'idle',
  fetchError = null,
  injectedCSS = '',
  onTabChange = () => {},
  onUrlChange = () => {},
  onFetch = () => {},
  children,
  className = '',
}: PreviewAreaRootProps) {
  // Determine if chat should be empty (no submitted URL in live mode)
  const isEmpty = mode === 'live' && !submittedUrl

  // Validate the submitted YouTube URL (only after user clicks Fetch)
  const validation = useMemo(() => validateYouTubeUrl(submittedUrl), [submittedUrl])
  const urlError = validation.isValid || !submittedUrl ? null : (validation.errorMessage ?? null)

  // Use validated videoId when the submitted URL is valid
  const videoId = validation.isValid ? validation.videoId : null

  // Retry fetch
  const onRetryFetch = useCallback(() => {
    onFetch()
  }, [onFetch])

  const contextValue: PreviewAreaContext = {
    messages,
    mode,
    activeTab,
    url,
    videoId,
    urlError,
    isEmpty,
    injectedCSS,
    videoInfo,
    fetchStatus,
    fetchError,
    onTabChange,
    onUrlChange,
    onFetch,
    onRetryFetch,
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

PreviewArea.VideoInfo = function PreviewAreaVideoInfo() {
  const { videoInfo, fetchStatus, onRetryFetch } = usePreviewAreaContext()

  if (!videoInfo || fetchStatus !== 'success') return null

  return (
    <div className="absolute top-20 left-6 right-6 z-10 flex items-center gap-4 glass-medium border border-outline-variant rounded-xl p-3">
      <img
        src={videoInfo.thumbnailUrl}
        alt={videoInfo.title}
        className="w-16 h-9 rounded-lg object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-label-md font-bold text-on-surface truncate">{videoInfo.title}</p>
        <a
          href={videoInfo.authorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-label-sm text-primary hover:underline"
        >
          {videoInfo.authorName}
        </a>
      </div>
      <button
        onClick={onRetryFetch}
        className="text-label-sm text-primary hover:underline flex-shrink-0"
      >
        Refresh
      </button>
    </div>
  )
}

PreviewArea.Chat = function PreviewAreaChat() {
  const { messages, mode, videoId, urlError, isEmpty, fetchStatus, fetchError, injectedCSS } =
    usePreviewAreaContext()

  // Loading state (fetching video metadata from oEmbed API)
  if (mode === 'live' && fetchStatus === 'loading') {
    return (
      <div className="w-full max-w-[400px] h-[600px] glass-heavy rounded-xl shadow-2xl flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-label-md text-on-surface-variant">Fetching video info...</p>
        </div>
      </div>
    )
  }

  // Error state (oEmbed API failed)
  if (mode === 'live' && fetchStatus === 'error') {
    return (
      <div className="w-full max-w-[400px] h-[600px] glass-heavy rounded-xl shadow-2xl flex flex-col items-center justify-center p-6">
        <span className="material-symbols-outlined text-warning text-[48px] mb-4">link_off</span>
        <p className="text-body-md text-on-surface font-bold text-center mb-2">
          Could not load video info
        </p>
        <p className="text-label-md text-on-surface-variant text-center max-w-[280px] mb-6">
          {fetchError}
        </p>
      </div>
    )
  }

  // Live mode with successful fetch → show available preview options
  if (mode === 'live' && fetchStatus === 'success' && videoId) {
    return (
      <div className="w-full max-w-[400px] h-[600px] glass-heavy rounded-xl shadow-2xl flex flex-col items-center justify-center p-6">
        <span className="material-symbols-outlined text-primary text-[48px] mb-4">live_tv</span>
        <p className="text-body-md text-on-surface font-bold text-center mb-2">Live Chat Loaded</p>
        <p className="text-label-md text-on-surface-variant text-center max-w-[280px] mb-4">
          Click <span className="font-bold text-on-surface">Live Preview</span> below to open a
          native Tauri window with YouTube's live chat and your CSS injected.
        </p>
        <div className="flex items-center gap-2 text-label-sm text-outline">
          <span className="material-symbols-outlined text-[16px]">info</span>
          <span>Or use Demo Mode to preview your CSS with mock messages</span>
        </div>
      </div>
    )
  }

  // Live mode with URL but invalid → show URL error
  if (mode === 'live' && urlError) {
    return (
      <div className="w-full max-w-[400px] h-[600px] glass-heavy rounded-xl shadow-2xl flex flex-col items-center justify-center p-6">
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
    <ChatPreview messages={messages} isEmpty={isEmpty} css={injectedCSS}>
      <ChatPreview.Header />
      <ChatPreview.Messages />
    </ChatPreview>
  )
}

PreviewArea.Actions = function PreviewAreaActions() {
  const { fetchStatus, mode, videoId, injectedCSS } = usePreviewAreaContext()
  const { isTauri, openPreview, updateCSS, closePreview } = useElectronPreview()
  const [previewOpen, setPreviewOpen] = useState(false)
  const previewStartRef = useRef<number | null>(null)

  // Listen for Electron preview window closing (by user or main process)
  useEffect(() => {
    const handleClosed = () => {
      setPreviewOpen(false)
      // Track preview duration
      if (previewStartRef.current) {
        const duration = Math.round((Date.now() - previewStartRef.current) / 1000)
        trackEventAsync('preview_duration', { duration_seconds: duration })
        previewStartRef.current = null
      }
    }
    window.addEventListener('electron-preview-closed', handleClosed)
    return () => window.removeEventListener('electron-preview-closed', handleClosed)
  }, [])

  // Auto-sync CSS to the preview window as the user edits settings (debounced)
  useEffect(() => {
    if (!previewOpen || !injectedCSS) return
    const timer = setTimeout(() => updateCSS(injectedCSS), 300)
    return () => clearTimeout(timer)
  }, [previewOpen, injectedCSS, updateCSS])

  const handleLivePreview = useCallback(() => {
    if (previewOpen) {
      closePreview()
      setPreviewOpen(false)
      // Track preview duration
      if (previewStartRef.current) {
        const duration = Math.round((Date.now() - previewStartRef.current) / 1000)
        trackEventAsync('preview_duration', { duration_seconds: duration })
        previewStartRef.current = null
      }
    } else if (videoId) {
      openPreview(videoId, injectedCSS)
      setPreviewOpen(true)
      previewStartRef.current = Date.now()
      trackEventAsync('preview_opened', {
        has_video_id: !!videoId,
        video_provided: !!videoId,
      })
    }
  }, [previewOpen, videoId, injectedCSS, openPreview, closePreview])

  return (
    <div className="absolute bottom-6 right-6 flex items-center gap-3">
      {/* Send to Stream flow */}
      <StreamSender videoId={videoId} injectedCSS={injectedCSS} />

      {mode === 'live' && fetchStatus === 'success' && (
        <>
          {isTauri && (
            <button
              onClick={handleLivePreview}
              className="flex items-center gap-1.5 glass-accent-primary text-on-primary px-3 py-1.5 rounded-full text-label-sm font-medium"
            >
              <span className="material-symbols-outlined text-[18px]">
                {previewOpen ? 'close' : 'visibility'}
              </span>
              {previewOpen ? 'Close Preview' : 'Live Preview'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export type { PreviewAreaRootProps, ChatMode }
