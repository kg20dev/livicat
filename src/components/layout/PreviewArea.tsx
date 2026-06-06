import { createContext, useContext, useMemo } from 'react'
import ChatPreview, { type Message } from '../chat/ChatPreview'
import ChatIframe from '../chat/ChatIframe'
import LiveBadge from '../ui/LiveBadge'
import UrlInputBar, { type ChatMode } from '../ui/UrlInputBar'
import ControlButtons from '../ui/ControlButtons'

/* ─── Video ID Extraction ───────────────────────────────────────── */

/**
 * Extract the YouTube video ID from a URL or return the string as-is
 * if it looks like a short video ID (11 chars, alphanumeric + _-).
 */
function extractVideoId(url: string): string | null {
  if (!url) return null

  const trimmed = url.trim()

  // If it's just an 11-character video ID (standard YouTube ID length)
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed
  }

  try {
    // Handle full URLs
    const u = new URL(trimmed)

    // youtube.com/watch?v=VIDEO_ID
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      // youtu.be/VIDEO_ID
      if (u.hostname === 'youtu.be') {
        return u.pathname.slice(1).split('/')[0] || null
      }

      // youtube.com/watch?v=VIDEO_ID
      const v = u.searchParams.get('v')
      if (v) return v

      // youtube.com/embed/VIDEO_ID or youtube.com/live/VIDEO_ID
      const pathParts = u.pathname.split('/').filter(Boolean)
      const embedIndex = pathParts.indexOf('embed')
      if (embedIndex !== -1) return pathParts[embedIndex + 1] || null
      const liveIndex = pathParts.indexOf('live')
      if (liveIndex !== -1) return pathParts[liveIndex + 1] || null
    }
  } catch {
    // Not a valid URL, return null
  }

  return null
}

/* ─── Context ────────────────────────────────────────────────────── */

interface PreviewAreaContext {
  messages: Message[]
  mode: ChatMode
  activeTab: string
  url: string
  videoId: string | null
  isEmpty: boolean
  injectedCSS: string
  onTabChange: (tab: string) => void
  onUrlChange: (url: string) => void
  onFetch: () => void
  onRandomize: () => void
  onToggle: () => void
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
  // Determine if chat should be empty
  const isEmpty = mode === 'live' && !url

  // Extract video ID from URL
  const videoId = useMemo(() => extractVideoId(url), [url])

  return (
    <PreviewAreaContext.Provider
      value={{
        messages,
        mode,
        activeTab,
        url,
        videoId,
        isEmpty,
        injectedCSS,
        onTabChange,
        onUrlChange,
        onFetch,
        onRandomize,
        onToggle,
      }}
    >
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
  const { messages, mode, videoId, isEmpty, injectedCSS } = usePreviewAreaContext()

  // Live mode with valid video ID → show the actual YouTube iframe
  if (mode === 'live' && videoId) {
    return <ChatIframe videoId={videoId} injectedCSS={injectedCSS} />
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
  const { onRandomize, onToggle } = usePreviewAreaContext()

  return (
    <ControlButtons onRandomize={onRandomize} onToggle={onToggle}>
      <ControlButtons.Randomize />
      <ControlButtons.Toggle />
    </ControlButtons>
  )
}

export type { PreviewAreaRootProps, ChatMode }
