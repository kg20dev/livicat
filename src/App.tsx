import { useState } from 'react'
import ChatDisplay from './components/ChatDisplay'
import PollingPanel from './components/PollingPanel'
import SettingsPanel from './components/SettingsPanel'
import { Card } from './components/shared'
import { useYouTubeChat } from './hooks/useYouTubeChat'
import './App.css'

function App() {
  const [apiKey, setApiKey] = useState('')
  const [videoId, setVideoId] = useState('')

  const {
    messages,
    error,
    messageCount,
    connectionStatus,
    isStreamEnded,
    getConnectionStatusText,
    startPolling,
    stopPolling,
    clearMessages,
  } = useYouTubeChat(apiKey, videoId)

  // Track the raw input for parsing on connection
  const [pendingVideoId, setPendingVideoId] = useState('')

  const handleConnect = async () => {
    setVideoId(pendingVideoId)
    // Small delay to let state propagate
    await new Promise(r => setTimeout(r, 50))
    await startPolling()
  }

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-blue-500">
            Livicat - YouTube Live Chat Editor
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Display */}
            <div className="lg:col-span-2">
              <ChatDisplay messages={messages} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <PollingPanel
                apiKey={apiKey}
                videoId={videoId}
                connectionStatus={connectionStatus}
                messageCount={messageCount}
                isStreamEnded={isStreamEnded}
                error={error}
                getConnectionStatusText={getConnectionStatusText}
                onApiKeyChange={setApiKey}
                onVideoInputChange={(input) => setPendingVideoId(input)}
                onConnect={handleConnect}
                onDisconnect={stopPolling}
                onClearMessages={clearMessages}
              />
              <SettingsPanel />
            </div>
          </div>

          {/* Status footer */}
          <div className="mt-8">
            <Card title="Connection Log">
              <div className="text-sm text-gray-400 space-y-1">
                <p>Status: {getConnectionStatusText()}</p>
                <p>Messages received: {messageCount}</p>
                {videoId && <p>Video: {videoId}</p>}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
