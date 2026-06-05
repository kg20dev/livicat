/**
 * Chat Polling Service
 * Handles polling of YouTube Live Chat messages with:
 * - Exponential backoff for transient errors
 * - Stream lifecycle detection (start/end)
 * - Message deduplication via cache
 * - Configurable polling buffer
 */

import { YouTubeService } from './YouTubeService'
import type { YouTubeChatMessage } from '../types/youtube'

export interface PollingOptions {
  onError?: (error: string) => void
  onNewMessages?: (messages: YouTubeChatMessage[]) => void
  onStreamEnd?: () => void        // Called when the live stream ends
  onPollingStart?: () => void     // Called when polling begins
  onPollingStop?: () => void      // Called when polling stops (intentional or error)
  pollingBuffer?: number          // Additional buffer time beyond YouTube's interval (ms)
}

export interface PollingResult {
  messages: YouTubeChatMessage[]
  nextPageToken?: string
  pollingIntervalMillis: number
  error?: string
}

export class ChatPollingService {
  private youtubeService: YouTubeService
  private liveChatId: string | null = null
  private currentPageToken: string | undefined
  private isPolling = false
  private pollingTimer: ReturnType<typeof setTimeout> | null = null
  private options: PollingOptions
  private messageCache: Map<string, YouTubeChatMessage> = new Map()
  private messageIds: string[] = []

  // Exponential backoff
  private retryDelay = 1000
  private readonly maxRetryDelay = 60000
  private readonly backoffMultiplier = 2

  constructor(youtubeService: YouTubeService, options: PollingOptions = {}) {
    this.youtubeService = youtubeService
    this.options = options
  }

  /**
   * Start polling for chat messages from a live stream video.
   * Returns false if the stream is not live or chat is unavailable.
   */
  async startPolling(videoId: string): Promise<boolean> {
    if (this.isPolling) {
      console.warn('Already polling')
      return true
    }

    try {
      this.isPolling = true
      this.retryDelay = 1000 // Reset backoff on fresh start

      const liveChatId = await this.youtubeService.getLiveChatId(videoId)

      if (!liveChatId) {
        this.options.onError?.('Stream is not live or chat not available')
        this.stopPolling()
        return false
      }

      this.liveChatId = liveChatId
      this.currentPageToken = undefined
      this.options.onPollingStart?.()

      // Start the polling loop (non-blocking)
      this.pollingLoop()

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start polling'
      console.error('Failed to start polling:', error)
      this.options.onError?.(message)
      this.isPolling = false
      return false
    }
  }

  /**
   * Stop polling and reset state
   */
  stopPolling(): void {
    if (this.isPolling) {
      this.options.onPollingStop?.()
    }

    this.isPolling = false

    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer)
      this.pollingTimer = null
    }

    this.liveChatId = null
    this.currentPageToken = undefined
    this.retryDelay = 1000
  }

  /** Get current polling status */
  isActive(): boolean {
    return this.isPolling
  }

  /** Get all cached messages in order */
  getMessages(): YouTubeChatMessage[] {
    return this.messageIds
      .map(id => this.messageCache.get(id))
      .filter((msg): msg is YouTubeChatMessage => msg !== undefined)
  }

  /** Get total cached message count */
  getMessageCount(): number {
    return this.messageIds.length
  }

  /** Clear message cache */
  clearMessages(): void {
    this.messageCache.clear()
    this.messageIds = []
  }

  /**
   * Main polling loop with:
   * - Message deduplication
   * - Exponential backoff on transient errors
   * - Automatic stop on fatal errors (stream ended, quota exceeded)
   * - Respects YouTube's pollingIntervalMillis
   */
  private async pollingLoop(): Promise<void> {
    while (this.isPolling && this.liveChatId) {
      try {
        const result = await this.youtubeService.fetchChatMessages(
          this.liveChatId,
          this.currentPageToken
        )

        if (result.error) {
          this.options.onError?.(result.error)

          // Fatal errors — stop polling
          if (
            result.error.toLowerCase().includes('live chat not found') ||
            result.error.toLowerCase().includes('not found') ||
            result.error.toLowerCase().includes('quota')
          ) {
            this.options.onStreamEnd?.()
            this.stopPolling()
            return
          }

          // Transient error — retry with exponential backoff
          await this.sleep(this.retryDelay)
          this.retryDelay = Math.min(this.retryDelay * this.backoffMultiplier, this.maxRetryDelay)
          continue
        }

        // Success — reset backoff
        this.retryDelay = 1000

        // Add new messages to cache
        const newMessages = this.filterNewMessages(result.messages)

        if (newMessages.length > 0) {
          this.options.onNewMessages?.(newMessages)
        }

        this.currentPageToken = result.nextPageToken

        // Calculate polling interval with buffer
        const pollingInterval =
          result.pollingIntervalMillis + (this.options.pollingBuffer ?? 1000)

        await this.sleep(pollingInterval)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Polling error'
        console.error('Error in polling loop:', error)
        this.options.onError?.(message)

        // Retry with exponential backoff
        await this.sleep(this.retryDelay)
        this.retryDelay = Math.min(this.retryDelay * this.backoffMultiplier, this.maxRetryDelay)
      }
    }
  }

  /**
   * Filter out already seen messages and add new ones to cache
   */
  private filterNewMessages(messages: YouTubeChatMessage[]): YouTubeChatMessage[] {
    const newMessages: YouTubeChatMessage[] = []

    for (const message of messages) {
      if (!this.messageCache.has(message.id)) {
        this.messageCache.set(message.id, message)
        this.messageIds.push(message.id)
        newMessages.push(message)
      }
    }

    return newMessages
  }

  /** Sleep helper */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default ChatPollingService
