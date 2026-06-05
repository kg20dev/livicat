import { useState, useEffect, useCallback, useRef } from 'react'
import { YouTubeService, ConnectionStatus } from '../services/YouTubeService'
import { ChatPollingService } from '../services/ChatPollingService'
import type { YouTubeChatMessage } from '../types/youtube'

/**
 * Custom hook for managing YouTube Live Chat connection and polling
 */
export const useYouTubeChat = (apiKey: string, videoId: string) => {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<YouTubeChatMessage[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED
  )
  const [isStreamEnded, setIsStreamEnded] = useState(false)

  const pollingServiceRef = useRef<ChatPollingService | null>(null)
  const youtubeServiceRef = useRef<YouTubeService | null>(null)

  // Reset function for when apiKey changes
  const resetState = useCallback(() => {
    setError(null)
    setMessages([])
    setIsStreamEnded(false)
    setConnectionStatus(ConnectionStatus.DISCONNECTED)
    setIsConnected(false)
  }, [])

  // Initialize services when API key changes
  useEffect(() => {
    if (!apiKey) {
      resetState()
      return
    }

    resetState()

    const youtubeService = new YouTubeService(apiKey)
    youtubeServiceRef.current = youtubeService

    youtubeService.onConnectionStatusChange((status) => {
      setConnectionStatus(status)
      setIsConnected(status === ConnectionStatus.CONNECTED)
    })

    youtubeService.validateApiKey()
      .then(isValid => {
        if (!isValid) {
          setError('Invalid API key')
        }
      })
      .catch(() => {
        setError('Failed to validate API key')
      })

    return () => {
      youtubeService.disconnect()
      pollingServiceRef.current?.stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey])

  /**
   * Start polling for chat messages
   */
  const startPolling = useCallback(async () => {
    if (!youtubeServiceRef.current || !videoId) {
      setError('YouTube service not initialized or no video ID provided')
      return
    }

    if (pollingServiceRef.current) {
      pollingServiceRef.current.stopPolling()
    }

    setIsStreamEnded(false)
    setError(null)

    const pollingService = new ChatPollingService(youtubeServiceRef.current, {
      onError: (errorMessage) => {
        setError(errorMessage)
      },
      onNewMessages: (newMessages) => {
        setMessages(prev => [...prev, ...newMessages])
      },
      onStreamEnd: () => {
        setIsStreamEnded(true)
        setError('Live stream has ended')
      },
      onPollingStart: () => {
        setError(null)
      },
      onPollingStop: () => {
        setIsStreamEnded(false)
      },
      pollingBuffer: 1000,
    })

    pollingServiceRef.current = pollingService

    const success = await pollingService.startPolling(videoId)

    if (!success) {
      setError('Failed to start polling — stream may not be live')
    }
  }, [videoId])

  /**
   * Stop polling for chat messages
   */
  const stopPolling = useCallback(() => {
    if (pollingServiceRef.current) {
      pollingServiceRef.current.stopPolling()
      pollingServiceRef.current = null
    }
  }, [])

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    if (pollingServiceRef.current) {
      pollingServiceRef.current.clearMessages()
    }
    setMessages([])
  }, [])

  /**
   * Get connection status text
   */
  const getConnectionStatusText = useCallback((): string => {
    if (isStreamEnded) return 'Stream ended'
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return 'Connected'
      case ConnectionStatus.CONNECTING:
        return 'Connecting...'
      case ConnectionStatus.ERROR:
        return 'Error'
      case ConnectionStatus.DISCONNECTED:
        return 'Disconnected'
      default:
        return 'Unknown'
    }
  }, [connectionStatus, isStreamEnded])

  return {
    isConnected,
    error,
    messages,
    messageCount: messages.length,
    connectionStatus,
    isStreamEnded,
    getConnectionStatusText,
    startPolling,
    stopPolling,
    clearMessages,
    resetState,
  }
}

/**
 * Custom hook for managing chat settings
 */
export const useChatSettings = () => {
  const [settings, setSettings] = useState({
    maxMessages: 100,
    showAvatars: true,
    showTimestamps: true,
    autoScroll: true,
    fontSize: 14,
    theme: 'dark',
  })

  const updateSetting = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return { settings, updateSetting }
}
