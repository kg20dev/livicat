import { useMemo } from 'react'
import type { YouTubeChatMessage } from '../../types/youtube'
import { MessageList } from './MessageList'
import { ConnectionStatus } from '../../services/YouTubeService'
import type { ChatSettings } from '../../hooks/useYouTubeChat'

interface ChatDisplayProps {
  messages?: YouTubeChatMessage[]
  connectionStatus?: ConnectionStatus
  error?: string | null
  messageCount?: number
  className?: string
  transparent?: boolean
  settings?: ChatSettings
}

/**
 * ChatDisplay - Main container for displaying YouTube Live Chat messages.
 *
 * Optimized for OBS browser source:
 * - No external animations (prevents OBS rendering issues)
 * - Virtual scrolling via react-window (handles 10K+ messages)
 * - Memoized message rows (zero re-render on scroll)
 * - Clean contrast styling for OBS overlay use
 */
export const ChatDisplay = ({
  messages = [],
  connectionStatus = ConnectionStatus.DISCONNECTED,
  error = null,
  messageCount = 0,
  className = '',
  transparent = false,
  settings,
}: ChatDisplayProps) => {
  // Extract settings with defaults
  const showAvatars = settings?.showAvatars ?? true
  const showTimestamps = settings?.showTimestamps ?? true
  const autoScroll = settings?.autoScroll ?? true
  const maxMessages = settings?.maxMessages ?? 100
  const bgOpacity = settings?.bgOpacity ?? 100
  const fontSize = settings?.fontSize ?? 14
  const messageSpacing = settings?.messageSpacing ?? 'normal'
  const animationSpeed = settings?.animationSpeed ?? 'normal'
  const usernameColor = settings?.usernameColor ?? '#60a5fa'
  const isLoading = connectionStatus === ConnectionStatus.CONNECTING
  const isError = connectionStatus === ConnectionStatus.ERROR || error !== null

  // Memoize the status bar based on current state
  const statusBar = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-900/20 border-b border-blue-800/30">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs text-blue-300">Connecting to chat...</span>
        </div>
      )
    }

    if (isError) {
      return (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-800/30">
          <span className="text-xs text-red-300">
            {error || 'Connection error'}
          </span>
        </div>
      )
    }

    if (messageCount > 0) {
      return (
        <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800/30 border-b border-gray-700/30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
          <span className="text-[10px] text-gray-500">
            {messageCount} message{messageCount !== 1 ? 's' : ''}
          </span>
        </div>
      )
    }

    return null
  }, [isLoading, isError, error, messageCount])

  // Empty state when not connected
  const showEmptyState =
    !isLoading && !isError && messages.length === 0 && messageCount === 0

  // Calculate background opacity
  const bgStyle = transparent
    ? { backgroundColor: `rgba(21, 25, 50, ${bgOpacity / 100})` }
    : { backgroundColor: `rgba(21, 25, 50, ${bgOpacity / 100})` }

  // Animation duration based on speed
  const animationDuration = animationSpeed === 'slow' ? '500ms' : animationSpeed === 'normal' ? '300ms' : '0ms'

  return (
    <div
      style={{ ...bgStyle, transitionDuration: animationDuration }}
      className={`${
        transparent
          ? 'border border-gray-600/20'
          : 'shadow-xl border border-gray-600'
      } rounded-lg flex flex-col h-[550px] overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-600 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold text-white tracking-tight">
          Live Chat
        </h2>
      </div>

      {/* Status Bar */}
      {statusBar}

      {/* Messages Area */}
      <div className="flex-1 relative">
        {showEmptyState ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-700/50 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">No messages yet</p>
              <p className="text-gray-600 text-xs mt-1">
                Connect to a live stream to see chat messages
              </p>
            </div>
          </div>
        ) : (
           <div className="h-full">
             <MessageList
               messages={messages}
               maxMessages={maxMessages}
               showAvatars={showAvatars}
               showTimestamps={showTimestamps}
               autoScroll={autoScroll}
               fontSize={fontSize}
               messageSpacing={messageSpacing}
               usernameColor={usernameColor}
               animationSpeed={animationSpeed}
             />
           </div>
        )}
      </div>

      {/* Footer */}
      {messageCount > 0 && (
        <div className="px-4 py-1.5 border-t border-gray-700/30 flex-shrink-0">
          <p className="text-[10px] text-gray-600 text-center">
            {messageCount > maxMessages
              ? `Showing last ${maxMessages} of ${messageCount} messages`
              : `${messageCount} message${messageCount !== 1 ? 's' : ''}`}
          </p>
        </div>
      )}
    </div>
  )
}

export default ChatDisplay
