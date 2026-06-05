import { useState } from 'react'
import { ConnectionStatus } from '../../services/YouTubeService'
import { Card, Button } from '../shared'

export type StreamStatus = 'idle' | 'validating' | 'live' | 'ended' | 'private' | 'not_found' | 'invalid'

interface PollingPanelProps {
  apiKey: string
  videoId: string
  connectionStatus: ConnectionStatus
  messageCount: number
  isStreamEnded: boolean
  error: string | null
  getConnectionStatusText: () => string
  onApiKeyChange: (key: string) => void
  onVideoInputChange: (input: string) => void
  onConnect: () => void
  onDisconnect: () => void
  onClearMessages: () => void
  keySaved?: boolean
  onClearSavedKey?: () => void
  streamStatus?: StreamStatus
  streamStatusText?: string
  className?: string
}

/**
 * PollingPanel — Connection controls for YouTube Live Chat.
 *
 * Provides inputs for API key and video ID/URL, connect/disconnect buttons,
 * status indicator, error display, and stream-ended notice.
 */
export const PollingPanel = ({
  apiKey,
  connectionStatus,
  messageCount,
  isStreamEnded,
  error,
  getConnectionStatusText,
  onApiKeyChange,
  onVideoInputChange,
  onConnect,
  onDisconnect,
  onClearMessages,
  keySaved = false,
  onClearSavedKey,
  streamStatus = 'idle',
  streamStatusText = '',
  className = '',
}: PollingPanelProps) => {
  const [inputValue, setInputValue] = useState('')
  const isConnected = connectionStatus === ConnectionStatus.CONNECTED

  const statusColor = () => {
    if (isStreamEnded) return 'bg-yellow-400'
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return 'bg-green-400'
      case ConnectionStatus.CONNECTING:
        return 'bg-yellow-400 animate-pulse'
      case ConnectionStatus.DISCONNECTED:
        return 'bg-gray-400'
      case ConnectionStatus.ERROR:
        return 'bg-red-400'
    }
  }

  const handleVideoInputChange = (value: string) => {
    setInputValue(value)
    onVideoInputChange(value)
  }

  const handleConnect = () => {
    if (apiKey && inputValue) {
      onConnect()
    }
  }

  return (
    <Card title="YouTube Live Chat" className={className}>
      <div className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${statusColor()}`} />
          <span className="text-sm text-gray-300">{getConnectionStatusText()}</span>
          {isConnected && (
            <span className="text-xs text-gray-500 ml-auto">
              {messageCount} messages
            </span>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* API Key Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm text-gray-400" htmlFor="api-key">
              YouTube API Key
            </label>
            {keySaved && (
              <button
                onClick={onClearSavedKey}
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                title="Forget saved key"
                disabled={isConnected}
              >
                Forget
              </button>
            )}
          </div>
          <div className="relative">
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-[#0a0e27] border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 pr-16"
              disabled={isConnected}
            />
            {keySaved && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-green-500">
                Saved
              </span>
            )}
          </div>
        </div>

        {/* Video ID Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-1" htmlFor="video-id">
            Video ID or URL
          </label>
          <input
            id="video-id"
            type="text"
            value={inputValue}
            onChange={(e) => handleVideoInputChange(e.target.value)}
            placeholder="dQw4w9WgXcQ or https://youtube.com/watch?v=..."
            className="w-full bg-[#0a0e27] border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            disabled={isConnected}
          />
          {/* Stream Status Indicator */}
          {streamStatus !== 'idle' && inputValue && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {streamStatus === 'validating' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-[10px] text-blue-400">{streamStatusText}</span>
                </>
              )}
              {streamStatus === 'live' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-[10px] text-green-400">{streamStatusText}</span>
                </>
              )}
              {streamStatus === 'ended' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-[10px] text-yellow-400">{streamStatusText}</span>
                </>
              )}
              {streamStatus === 'private' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-[10px] text-yellow-400">{streamStatusText}</span>
                </>
              )}
              {streamStatus === 'not_found' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-[10px] text-red-400">{streamStatusText}</span>
                </>
              )}
              {streamStatus === 'invalid' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-[10px] text-red-400">{streamStatusText}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              disabled={
                !apiKey || !inputValue || connectionStatus === ConnectionStatus.CONNECTING
              }
              variant="primary"
              className="flex-1"
            >
              {connectionStatus === ConnectionStatus.CONNECTING
                ? 'Connecting...'
                : 'Connect to Chat'}
            </Button>
          ) : (
            <Button onClick={onDisconnect} variant="secondary" className="flex-1">
              Disconnect
            </Button>
          )}
          <Button
            onClick={onClearMessages}
            disabled={messageCount === 0}
            variant="secondary"
          >
            Clear
          </Button>
        </div>

        {/* Stream Ended Notice */}
        {isStreamEnded && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded px-3 py-2 text-sm text-yellow-300">
            Stream has ended. Click disconnect to start a new session.
          </div>
        )}
      </div>
    </Card>
  )
}

export default PollingPanel
