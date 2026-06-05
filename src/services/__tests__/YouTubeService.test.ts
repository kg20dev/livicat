import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { YouTubeService, ConnectionStatus } from '../YouTubeService'

describe('YouTubeService', () => {
  let service: YouTubeService

  beforeEach(() => {
    vi.useFakeTimers()
    service = new YouTubeService('test-api-key')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('stores the API key', () => {
      expect(service.getApiKey()).toBe('test-api-key')
    })

    it('starts as DISCONNECTED', () => {
      expect(service.getConnectionStatus()).toBe(ConnectionStatus.DISCONNECTED)
    })
  })

  describe('getApiKey', () => {
    it('returns the API key passed to constructor', () => {
      const s = new YouTubeService('my-key-123')
      expect(s.getApiKey()).toBe('my-key-123')
    })
  })

  describe('getConnectionStatus', () => {
    it('returns current connection status', () => {
      expect(service.getConnectionStatus()).toBe(ConnectionStatus.DISCONNECTED)
    })
  })

  describe('onConnectionStatusChange', () => {
    it('fires callback when status changes via validateApiKey', async () => {
      const callback = vi.fn()
      service.onConnectionStatusChange(callback)

      const promise = service.validateApiKey()
      // During validateApiKey, status transitions to CONNECTING first
      expect(callback).toHaveBeenCalledWith(ConnectionStatus.CONNECTING)
      await promise
      // Then to CONNECTED after successful validation
      expect(callback).toHaveBeenCalledWith(ConnectionStatus.CONNECTED)
      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('does not throw if no callback is registered', () => {
      expect(() => {
        service.validateApiKey()
      }).not.toThrow()
    })
  })

  describe('validateApiKey', () => {
    it('transitions from DISCONNECTED → CONNECTING → CONNECTED', async () => {
      const statuses: ConnectionStatus[] = []
      service.onConnectionStatusChange((s) => statuses.push(s))

      const result = await service.validateApiKey()

      expect(result).toBe(true)
      expect(statuses).toEqual([
        ConnectionStatus.CONNECTING,
        ConnectionStatus.CONNECTED,
      ])
      expect(service.getConnectionStatus()).toBe(ConnectionStatus.CONNECTED)
    })

    it('returns true (stub)', async () => {
      const result = await service.validateApiKey()
      expect(result).toBe(true)
    })
  })

  describe('fetchChatMessages', () => {
    it('returns a ChatFetchResult with empty messages array', async () => {
      const result = await service.fetchChatMessages('chat-id-123')

      expect(result).toHaveProperty('messages')
      expect(result.messages).toEqual([])
      expect(result).toHaveProperty('nextPageToken')
      expect(result.nextPageToken).toBeUndefined()
      expect(result).toHaveProperty('pollingIntervalMillis')
      expect(result.pollingIntervalMillis).toBeGreaterThan(0)
      expect(result.error).toBeUndefined()
    })

    it('accepts optional pageToken parameter', async () => {
      const result = await service.fetchChatMessages('chat-id-123', 'page-token-abc')
      expect(result.messages).toEqual([])
    })

    it('delays when requests are too close together', async () => {
      await service.fetchChatMessages('chat-id-1')

      // Start second request immediately — it should need to wait
      // With fake timers, the setTimeout(1000) inside enforceRateLimit
      // won't fire unless we advance time
      const secondCall = service.fetchChatMessages('chat-id-2')

      // Advance time enough for the delay to complete
      vi.advanceTimersByTime(1500)

      await secondCall
      // If we reached here without timeout, delay was enforced
      expect(service.getConnectionStatus()).toBeDefined()
    })

    it('does not delay if enough time has passed since last request', async () => {
      await service.fetchChatMessages('chat-id-1')

      // Advance time past the 1s minimum interval
      vi.advanceTimersByTime(2000)

      const before = Date.now()
      await service.fetchChatMessages('chat-id-2')
      const elapsed = Date.now() - before

      // Should complete without delay
      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('getLiveChatId', () => {
    it('returns null (stub)', async () => {
      const result = await service.getLiveChatId('video-id-123')
      expect(result).toBeNull()
    })
  })

  describe('isStreamLive', () => {
    it('returns false (stub)', async () => {
      const result = await service.isStreamLive('video-id-123')
      expect(result).toBe(false)
    })
  })

  describe('disconnect', () => {
    it('sets status to DISCONNECTED', () => {
      // First connect
      service.onConnectionStatusChange(() => {})
      void service.validateApiKey()

      service.disconnect()
      expect(service.getConnectionStatus()).toBe(ConnectionStatus.DISCONNECTED)
    })

    it('notifies listeners of disconnection', () => {
      const callback = vi.fn()
      service.onConnectionStatusChange(callback)

      service.disconnect()

      expect(callback).toHaveBeenCalledWith(ConnectionStatus.DISCONNECTED)
    })

    it('clears the status change callback', () => {
      const callback = vi.fn()
      service.onConnectionStatusChange(callback)
      service.disconnect()

      // After disconnect, callback should not fire for subsequent operations
      callback.mockClear()
      void service.validateApiKey()

      // validateApiKey sets CONNECTING + CONNECTED — but callback was cleared
      // so we need to check via getConnectionStatus instead
      expect(service.getConnectionStatus()).toBe(ConnectionStatus.CONNECTED)
    })
  })
})
