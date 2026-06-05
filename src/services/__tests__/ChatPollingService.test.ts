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

  describe('getMessageCount', () => {
    it('returns 0 initially', () => {
      expect(service.getMessageCount()).toBe(0)
    })
  })

  describe('clearMessages', () => {
    it('clears cached messages without throwing', () => {
      service.clearMessages()
      expect(service.getMessages()).toEqual([])
    })
  })

  describe('startPolling', () => {
    it('returns false when getLiveChatId returns null', async () => {
      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue(null)

      const onError = vi.fn()
      service = new ChatPollingService(youtubeService, { onError })

      const result = await service.startPolling('video-id')

      expect(result).toBe(false)
      expect(service.isActive()).toBe(false)
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('not live')
      )
    })

    it('returns true and starts polling when chat is available', async () => {
      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [],
        nextPageToken: undefined,
        pollingIntervalMillis: 999999,
      })

      const result = await service.startPolling('video-id')

      expect(result).toBe(true)
      expect(service.isActive()).toBe(true)
    })

    it('returns true if already polling (no-op)', async () => {
      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [],
        nextPageToken: undefined,
        pollingIntervalMillis: 999999,
      })

      await service.startPolling('video-id')
      const result = await service.startPolling('video-id')

      expect(result).toBe(true)
    })

    it('fires onPollingStart callback when polling begins', async () => {
      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [],
        pollingIntervalMillis: 999999,
      })

      const onPollingStart = vi.fn()
      service = new ChatPollingService(youtubeService, { onPollingStart })

      await service.startPolling('video-id')

      expect(onPollingStart).toHaveBeenCalledOnce()
    })
  })

  describe('stopPolling', () => {
    it('stops an active polling session', async () => {
      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [],
        pollingIntervalMillis: 999999,
      })

      await service.startPolling('video-id')
      expect(service.isActive()).toBe(true)

      service.stopPolling()
      expect(service.isActive()).toBe(false)
    })

    it('does not throw when not polling', () => {
      expect(() => service.stopPolling()).not.toThrow()
    })

    it('fires onPollingStop callback', async () => {
      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [],
        pollingIntervalMillis: 999999,
      })

      const onPollingStop = vi.fn()
      service = new ChatPollingService(youtubeService, { onPollingStop })

      await service.startPolling('video-id')
      service.stopPolling()

      expect(onPollingStop).toHaveBeenCalledOnce()
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
        return { messages: [], pollingIntervalMillis: 999999 }
      })

      service = new ChatPollingService(youtubeService, {
        onNewMessages,
        pollingBuffer: 0,
      })

      await service.startPolling('video-id')

      // Advance enough time for 2 poll cycles (50ms each + processing)
      await vi.advanceTimersByTimeAsync(500)

      expect(onNewMessages).toHaveBeenCalledTimes(2)
      expect(onNewMessages).toHaveBeenNthCalledWith(1, [msg1])
      expect(onNewMessages).toHaveBeenNthCalledWith(2, [msg2])

      expect(service.getMessageCount()).toBe(2)
      expect(service.getMessages()[0].id).toBe('1')
      expect(service.getMessages()[1].id).toBe('2')

      service.stopPolling()
    })

    it('does not emit duplicate messages', async () => {
      const msg = makeMessage({ id: 'dup-1' })
      const onNewMessages = vi.fn()

      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [msg],
        nextPageToken: undefined,
        pollingIntervalMillis: 100,
      })

      service = new ChatPollingService(youtubeService, {
        onNewMessages,
        pollingBuffer: 0,
      })

      await service.startPolling('video-id')

      await vi.advanceTimersByTimeAsync(500)

      // Should have been called once for the first encounter only
      expect(onNewMessages).toHaveBeenCalledTimes(1)
      expect(service.getMessageCount()).toBe(1)

      service.stopPolling()
    })
  })

  describe('exponential backoff', () => {
    it('retries with increasing delay on transient errors', async () => {
      const onError = vi.fn()

      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [],
        error: 'transient error',
        pollingIntervalMillis: 5000,
      })

      service = new ChatPollingService(youtubeService, {
        onError,
        pollingBuffer: 0,
      })

      await service.startPolling('video-id')

      // Error fires immediately on first poll, then retry at:
      // 1s (retry 1), 2s (retry 2), 4s (retry 3)... 
      // Advance enough for 1 retry to complete
      await vi.advanceTimersByTimeAsync(2000)

      // onError called: first from initial fetch error, then from retries
      expect(onError).toHaveBeenCalledWith('transient error')

      // Still polling (transient error — not fatal)
      expect(service.isActive()).toBe(true)

      service.stopPolling()
    })
  })

  describe('stream lifecycle', () => {
    it('fires onStreamEnd and stops polling on fatal error', async () => {
      const onStreamEnd = vi.fn()

      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [],
        error: 'live chat not found',
        pollingIntervalMillis: 5000,
      })

      service = new ChatPollingService(youtubeService, {
        onStreamEnd,
        pollingBuffer: 0,
      })

      await service.startPolling('video-id')

      await vi.advanceTimersByTimeAsync(200)

      expect(onStreamEnd).toHaveBeenCalledOnce()
      expect(service.isActive()).toBe(false)
    })

    it('stops on quota exceeded error', async () => {
      const onStreamEnd = vi.fn()

      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockResolvedValue({
        messages: [],
        error: 'quota exceeded',
        pollingIntervalMillis: 5000,
      })

      service = new ChatPollingService(youtubeService, { onStreamEnd, pollingBuffer: 0 })

      await service.startPolling('video-id')
      await vi.advanceTimersByTimeAsync(200)

      expect(onStreamEnd).toHaveBeenCalledOnce()
      expect(service.isActive()).toBe(false)
    })

    it('recovers from transient errors', async () => {
      const msg = makeMessage({ id: 'recovered' })
      let callCount = 0

      vi.spyOn(youtubeService, 'getLiveChatId').mockResolvedValue('chat-id-123')
      vi.spyOn(youtubeService, 'fetchChatMessages').mockImplementation(async () => {
        callCount++
        if (callCount === 1) return { messages: [], error: 'transient', pollingIntervalMillis: 100 }
        return { messages: [msg], pollingIntervalMillis: 100 }
      })

      service = new ChatPollingService(youtubeService, { pollingBuffer: 0 })

      await service.startPolling('video-id')

      // First call fails (transient), wait for retry
      await vi.advanceTimersByTimeAsync(3000)

      // Second call should succeed
      expect(service.getMessages()).toHaveLength(1)
      expect(service.getMessages()[0].id).toBe('recovered')

      service.stopPolling()
    })
  })
})
