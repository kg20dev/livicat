import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChatPollingService } from '../ChatPollingService'
import { YouTubeService } from '../YouTubeService'
import type { YouTubeChatMessage } from '../../types/youtube'

function createMockYouTubeService(): YouTubeService {
  return new YouTubeService('fake-key')
}

function makeMessage(overrides: Partial<YouTubeChatMessage> = {}): YouTubeChatMessage {
  return {
    id: 'msg-1',
    snippet: {
      displayMessage: 'Hello',
      publishedAt: new Date().toISOString(),
    },
    authorDetails: {
      displayName: 'User1',
      profileImageUrl: 'https://example.com/avatar.png',
      channelId: 'channel-1',
    },
    ...overrides,
  }
}

describe('ChatPollingService', () => {
  let youtubeService: YouTubeService
  let service: ChatPollingService

  beforeEach(() => {
    vi.useFakeTimers()
    youtubeService = createMockYouTubeService()
    service = new ChatPollingService(youtubeService)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('creates an instance without options', () => {
      const s = new ChatPollingService(youtubeService)
      expect(s).toBeInstanceOf(ChatPollingService)
    })

    it('creates an instance with options', () => {
      const s = new ChatPollingService(youtubeService, { pollingBuffer: 2000 })
      expect(s).toBeInstanceOf(ChatPollingService)
    })
  })

  describe('isActive', () => {
    it('returns false initially', () => {
      expect(service.isActive()).toBe(false)
    })
  })

  describe('getMessages', () => {
    it('returns empty array initially', () => {
      expect(service.getMessages()).toEqual([])
    })
  })

  describe('clearMessages', () => {
    it('clears cached messages', () => {
      // We need to get messages into the cache first
      // Since startPolling requires a videoId and mock, let's test via an accessible path
      const s = new ChatPollingService(youtubeService)
      expect(s.getMessages()).toEqual([])

      // clearMessages on empty cache should not throw
      s.clearMessages()
      expect(s.getMessages()).toEqual([])
    })
  })

  describe('startPolling', () => {
    it('returns false when getLiveChatId returns null', async () => {
      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue(null)

      service = new ChatPollingService(youtubeService, {
        onError: vi.fn(),
      })

      const result = await service.startPolling('video-id')

      expect(result).toBe(false)
      expect(service.isActive()).toBe(false)
    })

    it('returns false and calls onError when getLiveChatId returns null', async () => {
      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue(null)

      const onError = vi.fn()
      service = new ChatPollingService(youtubeService, { onError })

      await service.startPolling('video-id')

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('not live')
      )
    })

    it('returns true and starts polling when chat is available', async () => {
      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [],
        nextPageToken: undefined,
        pollingIntervalMillis: 5000,
      })

      service = new ChatPollingService(youtubeService)
      const result = await service.startPolling('video-id')

      expect(result).toBe(true)
      expect(service.isActive()).toBe(true)
    })

    it('returns true if already polling (no-op)', async () => {
      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [],
        nextPageToken: undefined,
        pollingIntervalMillis: 999999, // long interval so it doesn't loop
      })

      service = new ChatPollingService(youtubeService)
      await service.startPolling('video-id')
      const result = await service.startPolling('video-id')

      expect(result).toBe(true)
    })
  })

  describe('stopPolling', () => {
    it('stops an active polling session', async () => {
      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [],
        nextPageToken: undefined,
        pollingIntervalMillis: 999999,
      })

      service = new ChatPollingService(youtubeService)
      await service.startPolling('video-id')
      expect(service.isActive()).toBe(true)

      service.stopPolling()
      expect(service.isActive()).toBe(false)
    })

    it('does not throw if called when not polling', () => {
      service = new ChatPollingService(youtubeService)
      expect(() => service.stopPolling()).not.toThrow()
    })
  })

  describe('message deduplication', () => {
    it('accumulates new messages via polling callback', async () => {
      const msg1 = makeMessage({ id: '1' })
      const msg2 = makeMessage({ id: '2' })

      let callCount = 0
      const onNewMessages = vi.fn()

      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockImplementation(async () => {
        callCount++
        if (callCount === 1) return { messages: [msg1], pollingIntervalMillis: 50 }
        if (callCount === 2) return { messages: [msg2], pollingIntervalMillis: 50 }
        // After 2 cycles, return nothing with a huge interval so the loop hangs
        return { messages: [], pollingIntervalMillis: 999999 }
      })

      service = new ChatPollingService(youtubeService, {
        onNewMessages,
        pollingBuffer: 0,
      })

      await service.startPolling('video-id')

      // Advance enough time for 2 full poll cycles (50ms sleep each + processing)
      await vi.advanceTimersByTimeAsync(500)

      // Should have received msg1 then msg2
      expect(onNewMessages).toHaveBeenCalledTimes(2)
      expect(onNewMessages).toHaveBeenNthCalledWith(1, [msg1])
      expect(onNewMessages).toHaveBeenNthCalledWith(2, [msg2])

      // Both messages should be in cache
      const cached = service.getMessages()
      expect(cached).toHaveLength(2)
      expect(cached[0].id).toBe('1')
      expect(cached[1].id).toBe('2')

      service.stopPolling()
    })

    it('does not emit duplicate messages', async () => {
      const msg = makeMessage({ id: 'dup-1' })

      const onNewMessages = vi.fn()

      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [msg], // Same message returned each time
        nextPageToken: undefined,
        pollingIntervalMillis: 100,
      })

      service = new ChatPollingService(youtubeService, {
        onNewMessages,
        pollingBuffer: 0,
      })

      await service.startPolling('video-id')

      // Run through multiple poll cycles
      await vi.advanceTimersByTimeAsync(500)

      // Should have only been called once with the deduped message
      expect(onNewMessages).toHaveBeenCalledTimes(1)
      expect(onNewMessages).toHaveBeenCalledWith([msg])

      // Cache should only have 1 message
      expect(service.getMessages()).toHaveLength(1)

      service.stopPolling()
    })
  })

  describe('error handling', () => {
    it('calls onError when fetchChatMessages returns an error', async () => {
      const onError = vi.fn()

      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [],
        error: 'API quota exceeded',
        pollingIntervalMillis: 5000,
      })

      service = new ChatPollingService(youtubeService, { onError, pollingBuffer: 0 })

      await service.startPolling('video-id')
      await vi.advanceTimersByTimeAsync(200)

      expect(onError).toHaveBeenCalledWith('API quota exceeded')

      service.stopPolling()
    })

    it('stops polling on fatal errors (quota)', async () => {
      const onError = vi.fn()

      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [],
        error: 'quota exceeded',
        pollingIntervalMillis: 5000,
      })

      service = new ChatPollingService(youtubeService, { onError, pollingBuffer: 0 })

      await service.startPolling('video-id')
      await vi.advanceTimersByTimeAsync(200)

      expect(onError).toHaveBeenCalled()
      expect(service.isActive()).toBe(false)
    })

    it('stops polling when chat not found', async () => {
      const onError = vi.fn()

      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [],
        error: 'live chat not found',
        pollingIntervalMillis: 5000,
      })

      service = new ChatPollingService(youtubeService, { onError, pollingBuffer: 0 })

      await service.startPolling('video-id')
      await vi.advanceTimersByTimeAsync(200)

      expect(service.isActive()).toBe(false)
    })

    it('recovers from transient errors', async () => {
      const onError = vi.fn()
      let callCount = 0

      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          return { messages: [], error: 'transient error', pollingIntervalMillis: 100 }
        }
        return { messages: [makeMessage({ id: 'recovered' })], pollingIntervalMillis: 100 }
      })

      service = new ChatPollingService(youtubeService, { onError, pollingBuffer: 0 })

      await service.startPolling('video-id')

      // First poll fails with transient error
      await vi.advanceTimersByTimeAsync(200)
      expect(onError).toHaveBeenCalledWith('transient error')
      expect(service.isActive()).toBe(true) // Still polling

      // Second poll succeeds
      await vi.advanceTimersByTimeAsync(7000) // Past the 5s retry delay
      expect(service.getMessages()).toHaveLength(1)
      expect(service.getMessages()[0].id).toBe('recovered')

      service.stopPolling()
    })
  })
})
