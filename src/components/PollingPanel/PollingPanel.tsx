import { FC, useState } from 'react'
import { ConnectionStatus } from '../../services/YouTubeService'
import { Card, Button } from '../shared'

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
  className?: string
}

export const PollingPanel: FC<PollingPanelProps> = ({
  apiKey,
  videoId: _videoId,
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
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('')
  const isConnected = connectionStatus === ConnectionStatus.CONNECTED

  const statusColor = (): string => {
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
      default:
        return 'bg-gray-400'
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
          <label className="block text-sm text-gray-400 mb-1" htmlFor="api-key">
            YouTube API Key
          </label>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-[#0a0e27] border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            disabled={isConnected}
          />
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
