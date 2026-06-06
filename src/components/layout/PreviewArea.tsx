import { createContext, useContext } from 'react'
import ChatPreview, { type Message } from '../chat/ChatPreview'
import LiveBadge from '../ui/LiveBadge'
import UrlInputBar, { type ChatMode } from '../ui/UrlInputBar'
import ControlButtons from '../ui/ControlButtons'

/* ─── Context ──────────────────────────────────────────────────── */

interface PreviewAreaContext {
  messages: Message[]
  mode: ChatMode
  activeTab: string
  url: string
  isEmpty: boolean
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

/* ─── Root ──────────────────────────────────────────────────────── */

interface PreviewAreaRootProps {
  messages?: Message[]
  mode?: ChatMode
  activeTab?: string
  url?: string
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

  return (
    <PreviewAreaContext.Provider
      value={{
        messages,
        mode,
        activeTab,
        url,
        isEmpty,
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

/* ─── Sub-components (exact HTML classes) ────────────────────────── */

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
  const { messages, isEmpty } = usePreviewAreaContext()

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
