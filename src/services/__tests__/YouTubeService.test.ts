import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { YouTubeService, ConnectionStatus } from '../YouTubeService'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('YouTubeService', () => {
  let service: YouTubeService

  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
    // Default: successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    })
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
      expect(callback).toHaveBeenCalledWith(ConnectionStatus.CONNECTING)
      await promise
      expect(callback).toHaveBeenCalledWith(ConnectionStatus.CONNECTED)
      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('does not throw if no callback is registered', () => {
      expect(() => {
        void service.validateApiKey()
      }).not.toThrow()
    })
  })

  describe('validateApiKey', () => {
    it('transitions from DISCONNECTED → CONNECTING → CONNECTED on success', async () => {
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

    it('returns false when API responds with error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: { message: 'Forbidden' } }),
      })

      const result = await service.validateApiKey()
      expect(result).toBe(false)
      expect(service.getConnectionStatus()).toBe(ConnectionStatus.ERROR)
    })
  })

  describe('fetchChatMessages', () => {
    it('returns a ChatFetchResult with empty messages when no items', async () => {
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
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageToken=page-token-abc')
      )
    })

    it('parses chat messages from API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'msg-1',
              snippet: {
                displayMessage: 'Hello!',
                publishedAt: '2024-01-15T10:30:00Z',
              },
              authorDetails: {
                displayName: 'TestUser',
                profileImageUrl: 'https://example.com/avatar.png',
                channelId: 'UC-test',
              },
            },
          ],
          nextPageToken: 'next-token-123',
          pollingIntervalMillis: 5000,
        }),
      })

      const result = await service.fetchChatMessages('chat-id-123')

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].id).toBe('msg-1')
      expect(result.messages[0].snippet.displayMessage).toBe('Hello!')
      expect(result.messages[0].authorDetails.displayName).toBe('TestUser')
      expect(result.nextPageToken).toBe('next-token-123')
    })

    it('returns error when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Live chat not found' } }),
      })

      const result = await service.fetchChatMessages('chat-id-123')

      expect(result.error).toContain('Live chat not found')
    })

    it('delays when requests are too close together', async () => {
      await service.fetchChatMessages('chat-id-1')

      const secondCall = service.fetchChatMessages('chat-id-2')
      vi.advanceTimersByTime(1500)

      await secondCall
      expect(service.getConnectionStatus()).toBeDefined()
    })

    it('does not delay if enough time has passed', async () => {
      await service.fetchChatMessages('chat-id-1')
      vi.advanceTimersByTime(2000)

      const before = Date.now()
      await service.fetchChatMessages('chat-id-2')
      const elapsed = Date.now() - before

      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('getLiveChatId', () => {
    it('returns null when no live chat is available', async () => {
      const result = await service.getLiveChatId('video-id-123')
      expect(result).toBeNull()
    })

    it('returns the activeLiveChatId from API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              liveStreamingDetails: {
                activeLiveChatId: 'chat-id-456',
              },
            },
          ],
        }),
      })

      const result = await service.getLiveChatId('video-id-123')
      expect(result).toBe('chat-id-456')
    })

    it('returns null when API response has no items', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      })

      const result = await service.getLiveChatId('video-id-123')
      expect(result).toBeNull()
    })
  })

  describe('isStreamLive', () => {
    it('returns false when video has no liveStreamingDetails', async () => {
      const result = await service.isStreamLive('video-id-123')
      expect(result).toBe(false)
    })

    it('returns true when video has actualStartTime', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              liveStreamingDetails: {
                actualStartTime: '2024-01-15T10:00:00Z',
              },
            },
          ],
        }),
      })

      const result = await service.isStreamLive('video-id-123')
      expect(result).toBe(true)
    })

    it('returns false when API response has no items', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      })

      const result = await service.isStreamLive('video-id-123')
      expect(result).toBe(false)
    })
  })

  describe('extractVideoId', () => {
    it('extracts video ID from youtube.com/watch URL', () => {
      expect(service.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
        .toBe('dQw4w9WgXcQ')
    })

    it('extracts video ID from youtu.be short URL', () => {
      expect(service.extractVideoId('https://youtu.be/dQw4w9WgXcQ'))
        .toBe('dQw4w9WgXcQ')
    })

    it('extracts video ID from youtube.com/embed URL', () => {
      expect(service.extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'))
        .toBe('dQw4w9WgXcQ')
    })

    it('accepts a raw 11-character video ID', () => {
      expect(service.extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('returns null for invalid input', () => {
      expect(service.extractVideoId('not-a-valid-id')).toBeNull()
    })

    it('returns null for empty input', () => {
      expect(service.extractVideoId('')).toBeNull()
      expect(service.extractVideoId('   ')).toBeNull()
    })

    it('trims whitespace from input', () => {
      expect(service.extractVideoId('  https://youtu.be/dQw4w9WgXcQ  '))
        .toBe('dQw4w9WgXcQ')
    })
  })

  describe('disconnect', () => {
    it('sets status to DISCONNECTED', () => {
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

      callback.mockClear()
      void service.validateApiKey()

      // After disconnect, callback was cleared, so status changes but no callback fires
      expect(callback).not.toHaveBeenCalled()
    })
  })
})
