import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { YouTubeService, ConnectionStatus } from '../YouTubeService'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

function mockResponse(data: unknown, status = 200, ok = true) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  })
}

describe('YouTubeService', () => {
  let service: YouTubeService

  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
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
    it('returns the API key', () => {
      expect(new YouTubeService('my-key').getApiKey()).toBe('my-key')
    })
  })

  describe('validateApiKey', () => {
    it('returns true and sets status to CONNECTED on success', async () => {
      mockFetch.mockResolvedValue(mockResponse({ items: [] }))

      const result = await service.validateApiKey()

      expect(result).toBe(true)
      expect(service.getConnectionStatus()).toBe(ConnectionStatus.CONNECTED)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/youtube/v3/')
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('test-api-key')
      )
    })

    it('returns false and sets status to ERROR on API failure', async () => {
      mockFetch.mockResolvedValue(mockResponse({ error: { message: 'Bad Request' } }, 400, false))

      const result = await service.validateApiKey()

      expect(result).toBe(false)
      expect(service.getConnectionStatus()).toBe(ConnectionStatus.ERROR)
    })

    it('returns false and sets status to ERROR on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'))

      const result = await service.validateApiKey()

      expect(result).toBe(false)
      expect(service.getConnectionStatus()).toBe(ConnectionStatus.ERROR)
    })

    it('transitions from DISCONNECTED → CONNECTING → CONNECTED', async () => {
      mockFetch.mockResolvedValue(mockResponse({ items: [] }))
      const statuses: ConnectionStatus[] = []
      service.onConnectionStatusChange((s) => statuses.push(s))

      await service.validateApiKey()

      expect(statuses).toEqual([
        ConnectionStatus.CONNECTING,
        ConnectionStatus.CONNECTED,
      ])
    })

    it('transitions from DISCONNECTED → CONNECTING → ERROR on failure', async () => {
      mockFetch.mockResolvedValue(mockResponse({}, 403, false))
      const statuses: ConnectionStatus[] = []
      service.onConnectionStatusChange((s) => statuses.push(s))

      await service.validateApiKey()

      expect(statuses).toEqual([
        ConnectionStatus.CONNECTING,
        ConnectionStatus.ERROR,
      ])
    })
  })

  describe('getLiveChatId', () => {
    const liveStreamingDetails = {
      items: [{
        liveStreamingDetails: {
          activeLiveChatId: 'Cg0KC2h5WHZ...',
          actualStartTime: '2024-01-01T00:00:00Z',
        },
      }],
    }

    it('returns the activeLiveChatId from a live stream', async () => {
      mockFetch.mockResolvedValue(mockResponse(liveStreamingDetails))

      const result = await service.getLiveChatId('video-id-123')

      expect(result).toBe('Cg0KC2h5WHZ...')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('part=liveStreamingDetails')
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('id=video-id-123')
      )
    })

    it('returns null if no items in response', async () => {
      mockFetch.mockResolvedValue(mockResponse({ items: [] }))

      const result = await service.getLiveChatId('invalid-video')

      expect(result).toBeNull()
    })

    it('returns null if liveStreamingDetails is missing', async () => {
      mockFetch.mockResolvedValue(mockResponse({
        items: [{ snippet: { title: 'Test' } }],
      }))

      const result = await service.getLiveChatId('no-stream')

      expect(result).toBeNull()
    })

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await service.getLiveChatId('video-id')

      expect(result).toBeNull()
    })
  })

  describe('fetchChatMessages', () => {
    const apiResponse = {
      items: [
        {
          id: 'msg-1',
          snippet: {
            displayMessage: 'Hello!',
            publishedAt: '2024-01-01T00:00:00Z',
          },
          authorDetails: {
            displayName: 'User1',
            profileImageUrl: 'https://example.com/avatar1.png',
            channelId: 'channel-1',
          },
        },
      ],
      nextPageToken: 'next-page-abc',
      pollingIntervalMillis: 5000,
    }

    it('returns messages from the API', async () => {
      mockFetch.mockResolvedValue(mockResponse(apiResponse))

      const result = await service.fetchChatMessages('chat-id')

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].id).toBe('msg-1')
      expect(result.messages[0].snippet.displayMessage).toBe('Hello!')
      expect(result.messages[0].authorDetails.displayName).toBe('User1')
      expect(result.nextPageToken).toBe('next-page-abc')
      expect(result.pollingIntervalMillis).toBe(5000)
      expect(result.error).toBeUndefined()
    })

    it('includes pageToken in the URL when provided', async () => {
      mockFetch.mockResolvedValue(mockResponse({ items: [], pollingIntervalMillis: 5000 }))

      await service.fetchChatMessages('chat-id', 'page-token-xyz')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageToken=page-token-xyz')
      )
    })

    it('returns error message on API error', async () => {
      mockFetch.mockResolvedValue(mockResponse(
        { error: { message: 'Live chat not found' } },
        404,
        false
      ))

      const result = await service.fetchChatMessages('invalid-chat')

      expect(result.messages).toEqual([])
      expect(result.error).toContain('Live chat not found')
    })

    it('returns network error on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await service.fetchChatMessages('chat-id')

      expect(result.error).toBe('Network error')
    })

    it('returns empty arrays when API returns no items', async () => {
      mockFetch.mockResolvedValue(mockResponse({ pollingIntervalMillis: 3000 }))

      const result = await service.fetchChatMessages('chat-id')

      expect(result.messages).toEqual([])
      expect(result.pollingIntervalMillis).toBe(3000)
    })
  })

  describe('isStreamLive', () => {
    it('returns true when stream has actualStartTime', async () => {
      mockFetch.mockResolvedValue(mockResponse({
        items: [{ liveStreamingDetails: { actualStartTime: '2024-01-01T00:00:00Z' } }],
      }))

      const result = await service.isStreamLive('video-id')

      expect(result).toBe(true)
    })

    it('returns false when no items', async () => {
      mockFetch.mockResolvedValue(mockResponse({ items: [] }))

      const result = await service.isStreamLive('video-id')

      expect(result).toBe(false)
    })

    it('returns false on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await service.isStreamLive('video-id')

      expect(result).toBe(false)
    })
  })

  describe('extractVideoId', () => {
    it('extracts ID from full YouTube URL', () => {
      expect(service.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
        .toBe('dQw4w9WgXcQ')
    })

    it('extracts ID from short youtu.be URL', () => {
      expect(service.extractVideoId('https://youtu.be/dQw4w9WgXcQ'))
        .toBe('dQw4w9WgXcQ')
    })

    it('extracts ID from embed URL', () => {
      expect(service.extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'))
        .toBe('dQw4w9WgXcQ')
    })

    it('returns the input if it is already a video ID', () => {
      expect(service.extractVideoId('dQw4w9WgXcQ'))
        .toBe('dQw4w9WgXcQ')
    })

    it('returns null for empty input', () => {
      expect(service.extractVideoId('')).toBeNull()
    })

    it('returns null for whitespace-only input', () => {
      expect(service.extractVideoId('   ')).toBeNull()
    })

    it('returns null for non-YouTube URLs', () => {
      expect(service.extractVideoId('https://example.com')).toBeNull()
    })
  })

  describe('onConnectionStatusChange', () => {
    it('fires callback when status changes via validateApiKey', async () => {
      mockFetch.mockResolvedValue(mockResponse({ items: [] }))
      const callback = vi.fn()
      service.onConnectionStatusChange(callback)

      await service.validateApiKey()

      expect(callback).toHaveBeenCalledWith(ConnectionStatus.CONNECTING)
      expect(callback).toHaveBeenCalledWith(ConnectionStatus.CONNECTED)
    })

    it('does not throw if no callback is registered', async () => {
      mockFetch.mockResolvedValue(mockResponse({ items: [] }))
      await expect(service.validateApiKey()).resolves.toBe(true)
    })
  })

  describe('disconnect', () => {
    it('sets status to DISCONNECTED and clears callback', () => {
      mockFetch.mockResolvedValue(mockResponse({ items: [] }))
      const callback = vi.fn()
      service.onConnectionStatusChange(callback)

      service.disconnect()

      expect(service.getConnectionStatus()).toBe(ConnectionStatus.DISCONNECTED)
      expect(callback).toHaveBeenCalledWith(ConnectionStatus.DISCONNECTED)
    })
  })
})
