import { FC, useRef, useEffect } from 'react'
import type { YouTubeChatMessage } from '../../types/youtube'

interface ChatDisplayProps {
  messages?: YouTubeChatMessage[]
  className?: string
  showAvatars?: boolean
  showTimestamps?: boolean
  autoScroll?: boolean
  maxMessages?: number
}

export const ChatDisplay: FC<ChatDisplayProps> = ({
  messages = [],
  className = '',
  showAvatars = true,
  showTimestamps = true,
  autoScroll = true,
  maxMessages = 100,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, autoScroll])

  const displayMessages = messages.slice(-maxMessages)

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      className={`bg-[#151932] rounded-lg shadow-xl border border-gray-600 flex flex-col h-[500px] ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-600 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Live Chat</h2>
        {messages.length > 0 && (
          <span className="text-xs text-gray-400">
            {messages.length} messages
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
      >
        {displayMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">
              {messages.length === 0
                ? 'Chat messages will appear here...'
                : 'No recent messages'}
            </p>
          </div>
        ) : (
          displayMessages.map((msg) => (
            <div
              key={msg.id}
              className="flex gap-3 py-2 border-b border-gray-700/50 last:border-0"
            >
              {/* Avatar */}
              {showAvatars && (
                <img
                  src={msg.authorDetails.profileImageUrl}
                  alt={msg.authorDetails.displayName}
                  className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
                />
              )}

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-blue-400 truncate">
                    {msg.authorDetails.displayName}
                  </span>
                  {showTimestamps && (
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatTime(msg.snippet.publishedAt)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-200 break-words">
                  {msg.snippet.displayMessage}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ChatDisplay
