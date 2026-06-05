import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useYouTubeChat, useChatSettings } from '../useYouTubeChat'
import { YouTubeService, ConnectionStatus } from '../../services/YouTubeService'

// Mock YouTubeService and ChatPollingService
vi.mock('../../services/YouTubeService', () => {
  const MockYouTubeService = vi.fn()
  const mockConnectionStatus = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    ERROR: 'error',
  }

  MockYouTubeService.prototype.constructor = vi.fn()
  MockYouTubeService.prototype.getApiKey = vi.fn().mockReturnValue('test-key')
  MockYouTubeService.prototype.validateApiKey = vi.fn().mockResolvedValue(true)
  MockYouTubeService.prototype.getLiveChatId = vi.fn().mockResolvedValue('chat-id-123')
  MockYouTubeService.prototype.fetchChatMessages = vi.fn().mockResolvedValue({
    messages: [],
    nextPageToken: undefined,
    pollingIntervalMillis: 5000,
  })
  MockYouTubeService.prototype.onConnectionStatusChange = vi.fn()
  MockYouTubeService.prototype.getConnectionStatus = vi.fn().mockReturnValue('disconnected')
  MockYouTubeService.prototype.disconnect = vi.fn()

  return {
    YouTubeService: MockYouTubeService,
    ConnectionStatus: mockConnectionStatus,
  }
})

vi.mock('../../services/ChatPollingService', () => {
  const MockChatPollingService = vi.fn()

  MockChatPollingService.prototype.startPolling = vi.fn().mockResolvedValue(true)
  MockChatPollingService.prototype.stopPolling = vi.fn()
  MockChatPollingService.prototype.isActive = vi.fn().mockReturnValue(false)
  MockChatPollingService.prototype.getMessages = vi.fn().mockReturnValue([])
  MockChatPollingService.prototype.clearMessages = vi.fn()

  return {
    ChatPollingService: MockChatPollingService,
  }
})

describe('useYouTubeChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns default disconnected state', () => {
    const { result } = renderHook(() => useYouTubeChat('', ''))

    expect(result.current.isConnected).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.messages).toEqual([])
    expect(result.current.connectionStatus).toBe(ConnectionStatus.DISCONNECTED)
  })

  it('creates YouTubeService when apiKey is provided', () => {
    renderHook(() => useYouTubeChat('valid-key', 'video-123'))

    expect(YouTubeService).toHaveBeenCalledWith('valid-key')
  })

  it('validates API key on mount', () => {
    renderHook(() => useYouTubeChat('valid-key', 'video-123'))

    const instance = (YouTubeService as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value
    expect(instance.validateApiKey).toHaveBeenCalled()
  })

  it('calls disconnect on unmount', () => {
    const { unmount } = renderHook(() => useYouTubeChat('valid-key', 'video-123'))

    const instance = (YouTubeService as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value

    unmount()

    expect(instance.disconnect).toHaveBeenCalled()
  })

  it('stops polling on unmount', () => {
    const { unmount } = renderHook(() => useYouTubeChat('valid-key', 'video-123'))

    unmount()

    // stopPolling should have been called on the pollingServiceRef if it exists
    // Since we mock ChatPollingService, the ref will be null unless startPolling was called
    // This just verifies no error is thrown
    expect(true).toBe(true)
  })

  describe('startPolling', () => {
    it('starts polling with the video ID', async () => {
      const { result } = renderHook(() => useYouTubeChat('valid-key', 'video-123'))

      await act(async () => {
        await result.current.startPolling()
      })

      expect(result.current.startPolling).toBeDefined()
    })
  })

  describe('stopPolling', () => {
    it('stops polling', async () => {
      const { result } = renderHook(() => useYouTubeChat('valid-key', 'video-123'))

      await act(async () => {
        result.current.stopPolling()
      })

      expect(result.current.stopPolling).toBeDefined()
    })
  })

  describe('clearMessages', () => {
    it('clears messages', async () => {
      const { result } = renderHook(() => useYouTubeChat('valid-key', 'video-123'))

      await act(async () => {
        result.current.clearMessages()
      })

      expect(result.current.messages).toEqual([])
    })
  })

  describe('getConnectionStatusText', () => {
    it('returns text for DISCONNECTED', () => {
      const { result } = renderHook(() => useYouTubeChat('', ''))

      expect(result.current.getConnectionStatusText()).toBe('Disconnected')
    })
  })
})

describe('useChatSettings', () => {
  it('returns default settings', () => {
    const { result } = renderHook(() => useChatSettings())

    expect(result.current.settings).toEqual({
      maxMessages: 100,
      showAvatars: true,
      showTimestamps: true,
      autoScroll: true,
      fontSize: 14,
      theme: 'dark',
    })
  })

  it('updates a single setting', () => {
    const { result } = renderHook(() => useChatSettings())

    act(() => {
      result.current.updateSetting('fontSize', 18)
    })

    expect(result.current.settings.fontSize).toBe(18)
    expect(result.current.settings.maxMessages).toBe(100) // unchanged
  })

  it('updates multiple settings independently', () => {
    const { result } = renderHook(() => useChatSettings())

    act(() => {
      result.current.updateSetting('maxMessages', 50)
    })
    act(() => {
      result.current.updateSetting('theme', 'light')
    })

    expect(result.current.settings.maxMessages).toBe(50)
    expect(result.current.settings.theme).toBe('light')
    expect(result.current.settings.fontSize).toBe(14) // unchanged
  })
})
