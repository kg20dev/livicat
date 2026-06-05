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

export type MessageSpacing = 'compact' | 'normal' | 'comfortable'
export type AnimationSpeed = 'none' | 'slow' | 'normal'

export interface ChatSettings {
  showAvatars: boolean
  showTimestamps: boolean
  autoScroll: boolean
  maxMessages: number
  fontSize: number
  theme: 'dark' | 'light'
  messageSpacing: MessageSpacing
  usernameColor: string
  bgOpacity: number
  animationSpeed: AnimationSpeed
}

const STORAGE_KEY = 'livicat_chat_settings'

const DEFAULT_SETTINGS: ChatSettings = {
  showAvatars: true,
  showTimestamps: true,
  autoScroll: true,
  maxMessages: 100,
  fontSize: 14,
  theme: 'dark',
  messageSpacing: 'normal',
  usernameColor: '#60a5fa',
  bgOpacity: 100,
  animationSpeed: 'normal',
}

/**
 * Load settings from localStorage
 */
function loadSettings(): ChatSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults to ensure all fields exist
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {
    // Storage unavailable or corrupted
  }
  return DEFAULT_SETTINGS
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: ChatSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage full or unavailable
  }
}

/**
 * Preset themes
 */
export const PRESET_THEMES: Record<string, ChatSettings> = {
  default: {
    showAvatars: true,
    showTimestamps: true,
    autoScroll: true,
    maxMessages: 100,
    fontSize: 14,
    theme: 'dark',
    messageSpacing: 'normal',
    usernameColor: '#60a5fa',
    bgOpacity: 100,
    animationSpeed: 'normal',
  },
  minimal: {
    showAvatars: false,
    showTimestamps: false,
    autoScroll: true,
    maxMessages: 100,
    fontSize: 13,
    theme: 'dark',
    messageSpacing: 'compact',
    usernameColor: '#94a3b8',
    bgOpacity: 95,
    animationSpeed: 'none',
  },
  compact: {
    showAvatars: true,
    showTimestamps: false,
    autoScroll: true,
    maxMessages: 150,
    fontSize: 12,
    theme: 'dark',
    messageSpacing: 'compact',
    usernameColor: '#818cf8',
    bgOpacity: 90,
    animationSpeed: 'normal',
  },
  large: {
    showAvatars: true,
    showTimestamps: true,
    autoScroll: true,
    maxMessages: 100,
    fontSize: 20,
    theme: 'dark',
    messageSpacing: 'comfortable',
    usernameColor: '#34d399',
    bgOpacity: 100,
    animationSpeed: 'slow',
  },
  stream: {
    showAvatars: true,
    showTimestamps: true,
    autoScroll: true,
    maxMessages: 100,
    fontSize: 16,
    theme: 'dark',
    messageSpacing: 'normal',
    usernameColor: '#f472b6',
    bgOpacity: 80,
    animationSpeed: 'normal',
  },
}

export const useChatSettings = () => {
  const [settings, setSettings] = useState<ChatSettings>(loadSettings)
  const [savedIndicator, setSavedIndicator] = useState(false)

  // Update a single setting
  const updateSetting = useCallback(
    <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
      setSettings(prev => {
        const newSettings = { ...prev, [key]: value }
        saveSettings(newSettings)
        return newSettings
      })
      
      // Show "Saved" indicator briefly
      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 1500)
    },
    []
  )

  // Apply a preset theme
  const applyPreset = useCallback((presetName: string) => {
    const preset = PRESET_THEMES[presetName]
    if (preset) {
      setSettings(preset)
      saveSettings(preset)
      
      // Show "Saved" indicator briefly
      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 1500)
    }
  }, [])

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    saveSettings(DEFAULT_SETTINGS)
    
    // Show "Saved" indicator briefly
    setSavedIndicator(true)
    setTimeout(() => setSavedIndicator(false), 1500)
  }, [])

  return {
    settings,
    updateSetting,
    applyPreset,
    resetToDefaults,
    savedIndicator,
    presets: PRESET_THEMES,
  }
}
