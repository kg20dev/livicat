import { createContext, useContext } from 'react'
import ChatMessage from './ChatMessage'

/* ─── Context ──────────────────────────────────────────────────── */

interface ChatPreviewContext {
  messages: Message[]
  showHeader: boolean
  showTimestamps: boolean
  isEmpty?: boolean
}

const ChatPreviewContext = createContext<ChatPreviewContext | null>(null)

function useChatPreviewContext() {
  const ctx = useContext(ChatPreviewContext)
  if (!ctx) throw new Error('ChatPreview compound components must be used within <ChatPreview>')
  return ctx
}

/* ─── Root ──────────────────────────────────────────────────────── */

export interface Message {
  id: string
  username: string
  message: string
  avatarSeed: string | number
  timestamp?: string
}

interface ChatPreviewRootProps {
  messages?: Message[]
  showHeader?: boolean
  isEmpty?: boolean
  css?: string
  children: React.ReactNode
  className?: string
}

export default function ChatPreview({
  messages = [],
  showHeader = true,
  isEmpty = false,
  css = '',
  children,
  className = '',
}: ChatPreviewRootProps) {
  // React-level fallback: derive timestamp visibility from injected CSS
  const showTimestamps = !css.includes('--chat-timestamp-display: none;')
  return (
    <ChatPreviewContext.Provider value={{ messages, showHeader, showTimestamps, isEmpty }}>
      <div
        className={`w-full max-w-[400px] h-[600px] glass-panel rounded-xl shadow-2xl flex flex-col overflow-hidden ${className}`}
      >
        {css && <style key={css} dangerouslySetInnerHTML={{ __html: css }} />}
        {children}
      </div>
    </ChatPreviewContext.Provider>
  )
}

/* ─── Sub-components (exact HTML classes) ────────────────────────── */

ChatPreview.Header = function ChatPreviewHeader() {
  const { showHeader } = useChatPreviewContext()
  if (!showHeader) return null

  return (
    <div className="p-4 border-b border-white/5 flex items-center justify-between">
      <span className="font-bold text-on-surface">Top Chat</span>
      <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">
        more_vert
      </span>
    </div>
  )
}

ChatPreview.Messages = function ChatPreviewMessages() {
  const { messages, showTimestamps, isEmpty } = useChatPreviewContext()

  // Empty state
  if (isEmpty || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <span className="material-symbols-outlined text-outline text-[48px] mb-4">chat_bubble</span>
        <p className="text-body-md text-on-surface-variant text-center">
          {isEmpty ? 'Enter a YouTube URL, then click Fetch Chat' : 'No messages yet'}
        </p>
      </div>
    )
  }

  return (
    <div id="chat" className="flex-1 overflow-y-auto">
      <div id="contents" className="h-full">
        <div id="items" className="p-4 space-y-4">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              username={msg.username}
              message={msg.message}
              avatarSeed={msg.avatarSeed}
              timestamp={showTimestamps ? msg.timestamp : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
