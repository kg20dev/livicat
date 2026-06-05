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

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

export class YouTubeService {
  private apiKey: string
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED
  private onStatusChange: ((status: ConnectionStatus) => void) | null = null
  private lastRequestTime = 0
  private readonly minRequestInterval = 1000 // Minimum 1 second between requests

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /** Get the stored API key */
  getApiKey(): string {
    return this.apiKey
  }

  /** Register connection status change handler */
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.onStatusChange = callback
  }

  /** Get current connection status */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  /**
   * Validate YouTube API key by making a test request to the videos endpoint.
   * Uses a known video ID to check if the key is valid and has quota remaining.
   */
  async validateApiKey(): Promise<boolean> {
    this.setConnectionStatus(ConnectionStatus.CONNECTING)

    try {
      const url = `${YOUTUBE_API_BASE}/videos?part=snippet&id=dQw4w9WgXcQ&key=${this.apiKey}`
      const response = await fetch(url)

      if (!response.ok) {
        this.setConnectionStatus(ConnectionStatus.ERROR)
        return false
      }

      this.setConnectionStatus(ConnectionStatus.CONNECTED)
      return true
    } catch {
      this.setConnectionStatus(ConnectionStatus.ERROR)
      return false
    }
  }

  /**
   * Get live chat ID from a video ID by querying the liveStreamingDetails.
   * Returns null if the stream is not live or has no active chat.
   */
  async getLiveChatId(videoId: string): Promise<string | null> {
    try {
      const url = `${YOUTUBE_API_BASE}/videos?part=liveStreamingDetails&id=${videoId}&key=${this.apiKey}`
      const response = await fetch(url)
      const data = await response.json()

      if (!data.items || data.items.length === 0) {
        return null
      }

      return data.items[0]?.liveStreamingDetails?.activeLiveChatId ?? null
    } catch {
      return null
    }
  }

  /**
   * Fetch live chat messages with pagination support.
   * Respects YouTube's pollingIntervalMillis and enforces client-side rate limiting.
   */
  async fetchChatMessages(
    liveChatId: string,
    pageToken?: string
  ): Promise<ChatFetchResult> {
    await this.enforceRateLimit()

    try {
      let url = `${YOUTUBE_API_BASE}/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${this.apiKey}`
      if (pageToken) {
        url += `&pageToken=${pageToken}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message =
          (errorData as { error?: { message?: string } })?.error?.message ??
          `HTTP ${response.status}`

        // Fatal errors that should stop polling
        if (response.status === 404 || response.status === 403) {
          return { messages: [], pollingIntervalMillis: 5000, error: message }
        }

        return { messages: [], pollingIntervalMillis: 5000, error: message }
      }

      const data = await response.json() as {
        items?: Array<{
          id: string
          snippet: {
            displayMessage: string
            publishedAt: string
          }
          authorDetails: {
            displayName: string
            profileImageUrl: string
            channelId: string
          }
        }>
        nextPageToken?: string
        pollingIntervalMillis?: number
      }

      const messages: YouTubeChatMessage[] = (data.items ?? []).map((item) => ({
        id: item.id,
        snippet: {
          displayMessage: item.snippet.displayMessage,
          publishedAt: item.snippet.publishedAt,
        },
        authorDetails: {
          displayName: item.authorDetails.displayName,
          profileImageUrl: item.authorDetails.profileImageUrl,
          channelId: item.authorDetails.channelId,
        },
      }))

      return {
        messages,
        nextPageToken: data.nextPageToken,
        pollingIntervalMillis: data.pollingIntervalMillis ?? 5000,
      }
    } catch {
      return { messages: [], pollingIntervalMillis: 5000, error: 'Network error' }
    }
  }

  /**
   * Check if a video is currently live streaming
   */
  async isStreamLive(videoId: string): Promise<boolean> {
    try {
      const url = `${YOUTUBE_API_BASE}/videos?part=liveStreamingDetails&id=${videoId}&key=${this.apiKey}`
      const response = await fetch(url)
      const data = await response.json() as {
        items?: Array<{
          liveStreamingDetails?: {
            actualStartTime?: string
            activeLiveChatId?: string
          }
        }>
      }

      if (!data.items || data.items.length === 0) return false

      const details = data.items[0]?.liveStreamingDetails
      return details?.actualStartTime != null
    } catch {
      return false
    }
  }

  /**
   * Extract a video ID from various input formats:
   * - Full URL: https://www.youtube.com/watch?v=XXXXX
   * - Short URL: https://youtu.be/XXXXX
   * - YouTube ID only: XXXXX
   */
  extractVideoId(input: string): string | null {
    const trimmed = input.trim()
    if (!trimmed) return null

    // Full URL pattern
    const urlMatch = trimmed.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    )
    if (urlMatch) return urlMatch[1]

    // Direct video ID (11 characters)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed

    return null
  }

  /** Disconnect and clean up */
  disconnect(): void {
    this.setConnectionStatus(ConnectionStatus.DISCONNECTED)
    this.onStatusChange = null
  }

  /** Enforce minimum request interval for rate limiting */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime

    if (elapsed < this.minRequestInterval) {
      await this.sleep(this.minRequestInterval - elapsed)
    }

    this.lastRequestTime = Date.now()
  }

  /** Update connection status and notify listeners */
  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status
    this.onStatusChange?.(status)
  }

  /** Sleep helper */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default YouTubeService
