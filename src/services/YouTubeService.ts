/**
 * YouTube API Service
 * Handles all YouTube Data API v3 interactions
 */

import type { YouTubeChatMessage } from '../types/youtube'

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface ChatFetchResult {
  messages: YouTubeChatMessage[]
  nextPageToken?: string
  pollingIntervalMillis: number
  error?: string
}

export class YouTubeService {
  private apiKey: string
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED
  private onStatusChange: ((status: ConnectionStatus) => void) | null = null
  private lastRequestTime = 0
  private readonly minRequestInterval = 1000 // Minimum 1 second between requests

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Get the stored API key
   */
  getApiKey(): string {
    return this.apiKey
  }

  /**
   * Register connection status change handler
   */
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.onStatusChange = callback
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  /**
   * Validate YouTube API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    this.setConnectionStatus(ConnectionStatus.CONNECTING)
    // TODO: Implement actual API key validation
    console.log('Validating API key:', this.getApiKey())
    this.setConnectionStatus(ConnectionStatus.CONNECTED)
    return true
  }

  /**
   * Fetch live chat messages with pagination
   */
  async fetchChatMessages(
    _liveChatId: string,
    _pageToken?: string
  ): Promise<ChatFetchResult> {
    await this.enforceRateLimit()

    // TODO: Implement actual YouTube API chat fetching
    return {
      messages: [],
      nextPageToken: undefined,
      pollingIntervalMillis: 5000,
    }
  }

  /**
   * Get live chat ID from video ID
   */
  async getLiveChatId(_videoId: string): Promise<string | null> {
    // TODO: Implement live chat ID retrieval
    return null
  }

  /**
   * Check if stream is live
   */
  async isStreamLive(_videoId: string): Promise<boolean> {
    // TODO: Implement stream live status check
    return false
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    this.setConnectionStatus(ConnectionStatus.DISCONNECTED)
    this.onStatusChange = null
  }

  /**
   * Enforce minimum request interval for rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime

    if (elapsed < this.minRequestInterval) {
      await this.sleep(this.minRequestInterval - elapsed)
    }

    this.lastRequestTime = Date.now()
  }

  /**
   * Update connection status and notify listeners
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status
    this.onStatusChange?.(status)
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default YouTubeService
