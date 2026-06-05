import { memo } from 'react'
import type { YouTubeChatMessage } from '../../types/youtube'

interface ChatMessageProps {
  message: YouTubeChatMessage
  showAvatar?: boolean
  showTimestamp?: boolean
  style?: React.CSSProperties
}

/**
 * Individual chat message component for displaying a single YouTube Live Chat message.
 * Memoized to prevent re-renders when the list scrolls.
 */
export const ChatMessage = memo(function ChatMessage({
  message,
  showAvatar = true,
  showTimestamp = true,
  style,
}: ChatMessageProps) {
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      style={style}
      className="flex gap-3 px-4 py-2 border-b border-gray-700/30 hover:bg-white/[0.02] transition-colors"
    >
      {/* Avatar */}
      {showAvatar && (
        <img
          src={message.authorDetails.profileImageUrl}
          alt={message.authorDetails.displayName}
          className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
          loading="lazy"
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-blue-400 truncate">
            {message.authorDetails.displayName}
          </span>
          {showTimestamp && (
            <span className="text-[10px] text-gray-500 flex-shrink-0">
              {formatTime(message.snippet.publishedAt)}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-200 break-words leading-relaxed">
          {message.snippet.displayMessage}
        </p>
      </div>
    </div>
  )
})

export default ChatMessage
