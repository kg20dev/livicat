import { useState } from 'react'
import ChatDisplay from './components/ChatDisplay'
import { Card, Button } from './components/shared'
import { useYouTubeChat } from './hooks/useYouTubeChat'
import { ConnectionStatus } from './services/YouTubeService'
import './App.css'

// Test data for development without a live stream
const DEMO_MESSAGES = false

function App() {
  const [apiKey, setApiKey] = useState('')
  const [videoId, setVideoId] = useState('')

  const hook = useYouTubeChat(apiKey, videoId)

  const handleConnect = async () => {
    if (!apiKey || !videoId) return
    await hook.startPolling()
  }

  const handleVideoIdChange = (input: string) => {
    // Try to extract video ID from URL
    const urlMatch = input.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    )
    if (urlMatch) {
      setVideoId(urlMatch[1])
    } else {
      setVideoId(input)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-blue-500 select-none">
            Livicat - YouTube Live Chat Editor
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Display */}
            <div className="lg:col-span-2">
              <ChatDisplay
                messages={DEMO_MESSAGES ? generateDemoMessages() : hook.messages}
                connectionStatus={hook.connectionStatus}
                error={hook.error}
                messageCount={hook.messages.length}
              />
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <Card title="Connection">
                <div className="space-y-3">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        hook.connectionStatus === ConnectionStatus.CONNECTED
                          ? 'bg-green-400'
                          : hook.connectionStatus === ConnectionStatus.CONNECTING
                            ? 'bg-yellow-400 animate-pulse'
                            : hook.connectionStatus === ConnectionStatus.ERROR
                              ? 'bg-red-400'
                              : 'bg-gray-500'
                      }`}
                    />
                    <span className="text-sm text-gray-300">
                      {hook.getConnectionStatusText()}
                    </span>
                  </div>

                  {/* Error */}
                  {hook.error && (
                    <div className="bg-red-900/30 border border-red-700 rounded px-3 py-2 text-xs text-red-300">
                      {hook.error}
                    </div>
                  )}

                  {/* API Key */}
                  <div>
                    <label
                      className="block text-xs text-gray-400 mb-1"
                      htmlFor="api-key"
                    >
                      YouTube API Key
                    </label>
                    <input
                      id="api-key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-[#0a0e27] border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      disabled={hook.isConnected}
                    />
                  </div>

                  {/* Video ID */}
                  <div>
                    <label
                      className="block text-xs text-gray-400 mb-1"
                      htmlFor="video-id"
                    >
                      Video ID or URL
                    </label>
                    <input
                      id="video-id"
                      type="text"
                      value={videoId}
                      onChange={(e) => handleVideoIdChange(e.target.value)}
                      placeholder="dQw4w9WgXcQ"
                      className="w-full bg-[#0a0e27] border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      disabled={hook.isConnected}
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    {!hook.isConnected ? (
                      <Button
                        onClick={handleConnect}
                        disabled={!apiKey || !videoId || hook.connectionStatus === ConnectionStatus.CONNECTING}
                        variant="primary"
                        className="flex-1"
                      >
                        {hook.connectionStatus === ConnectionStatus.CONNECTING
                          ? 'Connecting...'
                          : 'Connect'}
                      </Button>
                    ) : (
                      <Button
                        onClick={hook.stopPolling}
                        variant="secondary"
                        className="flex-1"
                      >
                        Disconnect
                      </Button>
                    )}
                    <Button
                      onClick={hook.clearMessages}
                      disabled={hook.messages.length === 0}
                      variant="secondary"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Generate demo messages for development/testing without API */
function generateDemoMessages() {
  const msgs = []
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank']
  const messages = [
    'Hello everyone!',
    'Great stream!',
    '🔥🔥🔥',
    'First time watching, love it!',
    'Can you see this?',
    'Hello from the chat!',
    'This is amazing content',
    'Keep it up!',
    '🎉🎉🎉',
    'Question about the setup...',
  ]

  for (let i = 0; i < 50; i++) {
    const name = names[i % names.length]
    msgs.push({
      id: `demo-${i}`,
      snippet: {
        displayMessage: messages[i % messages.length],
        publishedAt: new Date(Date.now() - (50 - i) * 5000).toISOString(),
      },
      authorDetails: {
        displayName: name,
        profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        channelId: `channel-${name.toLowerCase()}`,
      },
    })
  }
  return msgs
}

export default App
