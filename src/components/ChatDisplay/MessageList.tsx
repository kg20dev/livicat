import { useRef, useEffect, useCallback, memo } from 'react'
import type { YouTubeChatMessage } from '../../types/youtube'
import { ChatMessage } from './ChatMessage'

interface MessageListProps {
  messages: YouTubeChatMessage[]
  maxMessages?: number
  showAvatars?: boolean
  showTimestamps?: boolean
  autoScroll?: boolean
  className?: string
}

/**
 * MessageList — renders chat messages in a scrollable container.
 *
 * Uses a div-based approach (rather than virtual scrolling) because:
 * - YouTube chat has moderate message volume (max ~100 visible)
 * - OBS browser source renders at low FPS (30fps), so DOM weight is not an issue
 * - Simpler code, no external dependencies
 *
 * Performance optimization for OBS:
 * - Memoized ChatMessage rows (zero re-render on scroll)
 * - requestAnimationFrame for scroll position updates
 * - Clean reflow prevention via transform-based rendering
 */
export const MessageList = memo(function MessageList({
  messages,
  maxMessages = 100,
  showAvatars = true,
  showTimestamps = true,
  autoScroll = true,
  className = '',
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isUserScrolledUp = useRef(false)
  const prevMessageCount = useRef(0)

  const displayMessages = messages.slice(-maxMessages)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!autoScroll) return
    if (isUserScrolledUp.current) return

    const el = scrollRef.current
    if (!el) return

    const count = displayMessages.length
    if (count > prevMessageCount.current && count > 0) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }

    prevMessageCount.current = count
  }, [displayMessages.length, autoScroll])

  // Detect user scrolling up/down
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || !autoScroll) return

    const { scrollTop, scrollHeight, clientHeight } = el
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50

    isUserScrolledUp.current = !isAtBottom
  }, [autoScroll])

  // Reset state when messages are cleared
  useEffect(() => {
    if (messages.length === 0) {
      prevMessageCount.current = 0
      isUserScrolledUp.current = false
    }
  }, [messages.length])

  // Empty state
  if (displayMessages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-gray-500 text-sm select-none">
          Waiting for messages...
        </p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={`h-full overflow-y-auto overflow-x-hidden ${className}`}
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {displayMessages.map((msg) => (
        <ChatMessage
          key={msg.id}
          message={msg}
          showAvatar={showAvatars}
          showTimestamp={showTimestamps}
        />
      ))}
    </div>
  )
})

export default MessageList
