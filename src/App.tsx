import { useState, useEffect, useRef } from 'react'
import ChatDisplay from './components/ChatDisplay'
import PollingPanel from './components/PollingPanel'
import type { StreamStatus } from './components/PollingPanel/PollingPanel'
import { Card } from './components/shared'
import { useYouTubeChat } from './hooks/useYouTubeChat'
import { useApiKey } from './hooks/useApiKey'
import { YouTubeService } from './services/YouTubeService'
import './App.css'

// Test data for development without a live stream
const DEMO_MESSAGES = false

function App() {
  const { apiKey, setApiKey, clearSavedKey, keySaved } = useApiKey()
  const [videoId, setVideoId] = useState('')
  const [transparentBg, setTransparentBg] = useState(false)

  const hook = useYouTubeChat(apiKey, videoId)

  // Track the raw input for parsing on connection
  const [pendingVideoId, setPendingVideoId] = useState('')

  // Stream validation state
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle')
  const [streamStatusText, setStreamStatusText] = useState('')
  const youtubeServiceRef = useRef<YouTubeService | null>(null)
  const validateTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Create YouTubeService instance when API key changes
  useEffect(() => {
    youtubeServiceRef.current = apiKey ? new YouTubeService(apiKey) : null
  }, [apiKey])

  // Debounced stream validation when video input changes
  useEffect(() => {
    if (validateTimerRef.current) {
      clearTimeout(validateTimerRef.current)
    }

    if (!pendingVideoId || !youtubeServiceRef.current) {
      setStreamStatus('idle')
      setStreamStatusText('')
      return
    }

    const service = youtubeServiceRef.current
    const parsedId = service.extractVideoId(pendingVideoId)

    if (!parsedId) {
      setStreamStatus('invalid')
      setStreamStatusText('Invalid video ID or URL format')
      return
    }

    // Show validating state
    setStreamStatus('validating')
    setStreamStatusText('Checking stream status...')

    // Debounce API call to avoid excessive requests while typing
    validateTimerRef.current = setTimeout(async () => {
      try {
        const isLive = await service.isStreamLive(parsedId)
        if (isLive) {
          setStreamStatus('live')
          setStreamStatusText('Stream is live')
        } else {
          setStreamStatus('ended')
          setStreamStatusText('Stream is not currently live')
        }
      } catch {
        setStreamStatus('not_found')
        setStreamStatusText('Could not verify stream status')
      }
    }, 800)

    return () => {
      if (validateTimerRef.current) {
        clearTimeout(validateTimerRef.current)
      }
    }
  }, [pendingVideoId, apiKey])

  const handleConnect = async () => {
    setVideoId(pendingVideoId)
    // Small delay to let state propagate
    await new Promise(r => setTimeout(r, 50))
    await hook.startPolling()
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
                transparent={transparentBg}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* OBS Theme Toggle */}
              <Card title="OBS Mode">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-300">Transparent Background</span>
                  <button
                    onClick={() => setTransparentBg(!transparentBg)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      transparentBg ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                    title="Toggle transparent background for OBS overlay"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        transparentBg ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
                <p className="text-[10px] text-gray-500 mt-2">
                  {transparentBg
                    ? 'Chat background is transparent — overlay on your stream'
                    : 'Solid dark background for standalone viewing'}
                </p>
              </Card>

              <PollingPanel
                apiKey={apiKey}
                videoId={videoId}
                connectionStatus={hook.connectionStatus}
                messageCount={hook.messages.length}
                isStreamEnded={hook.isStreamEnded ?? false}
                error={hook.error}
                getConnectionStatusText={hook.getConnectionStatusText}
                onApiKeyChange={setApiKey}
                onVideoInputChange={(input) => setPendingVideoId(input)}
                onConnect={handleConnect}
                onDisconnect={hook.stopPolling}
                onClearMessages={hook.clearMessages}
                keySaved={keySaved}
                onClearSavedKey={clearSavedKey}
                streamStatus={streamStatus}
                streamStatusText={streamStatusText}
              />
            </div>
          </div>

          {/* Status footer */}
          <div className="mt-8">
            <Card title="Connection Log">
              <div className="text-sm text-gray-400 space-y-1">
                <p>Status: {hook.getConnectionStatusText()}</p>
                <p>Messages received: {hook.messages.length}</p>
                {videoId && <p>Video: {videoId}</p>}
              </div>
            </Card>
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
