/**
 * Chat Polling Service
 * Handles polling of YouTube Live Chat messages with proper rate limiting and error handling
 */

import { YouTubeService } from './YouTubeService'
import type { YouTubeChatMessage } from '../types/youtube'

export interface PollingOptions {
  onError?: (error: string) => void
  onNewMessages?: (messages: YouTubeChatMessage[]) => void
  pollingBuffer?: number // Add buffer time to polling interval (ms)
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

  constructor(youtubeService: YouTubeService, options: PollingOptions = {}) {
    this.youtubeService = youtubeService
    this.options = options
  }

  /**
   * Start polling for chat messages
   */
  async startPolling(videoId: string): Promise<boolean> {
    if (this.isPolling) {
      console.warn('Already polling')
      return true
    }

    try {
      this.isPolling = true

      const liveChatId = await this.youtubeService.getLiveChatId(videoId)

      if (!liveChatId) {
        this.options.onError?.('Stream is not live or chat not available')
        this.stopPolling()
        return false
      }

      this.liveChatId = liveChatId
      this.currentPageToken = undefined

      // Start the polling loop (non-blocking)
      this.pollingLoop()

      return true
    } catch (error) {
      console.error('Failed to start polling:', error)
      this.options.onError?.('Failed to start polling')
      this.isPolling = false
      return false
    }
  }

  /**
   * Stop polling for chat messages
   */
  stopPolling(): void {
    this.isPolling = false

    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer)
      this.pollingTimer = null
    }

    this.liveChatId = null
    this.currentPageToken = undefined
  }

  /**
   * Get current polling status
   */
  isActive(): boolean {
    return this.isPolling
  }

  /**
   * Get all cached messages in order
   */
  getMessages(): YouTubeChatMessage[] {
    return this.messageIds
      .map(id => this.messageCache.get(id))
      .filter((msg): msg is YouTubeChatMessage => msg !== undefined)
  }

  /**
   * Clear message cache
   */
  clearMessages(): void {
    this.messageCache.clear()
    this.messageIds = []
  }

  /**
   * Main polling loop
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

          if (result.error.includes('not found') || result.error.includes('quota')) {
            this.stopPolling()
            return
          }

          // Wait before retry on error
          await this.sleep(5000)
          continue
        }

        const newMessages = this.filterNewMessages(result.messages)

        if (newMessages.length > 0) {
          this.options.onNewMessages?.(newMessages)
        }

        this.currentPageToken = result.nextPageToken

        const pollingInterval = result.pollingIntervalMillis + (this.options.pollingBuffer || 1000)
        await this.sleep(pollingInterval)
      } catch (error) {
        console.error('Error in polling loop:', error)
        this.options.onError?.('Polling error occurred')
        await this.sleep(5000)
      }
    }
  }

  /**
   * Filter out already seen messages
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

  /**
   * Sleep helper function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default ChatPollingService
