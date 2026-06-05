/**
 * YouTube Chat Types
 */

export interface YouTubeChatMessage {
  id: string
  snippet: {
    displayMessage: string
    publishedAt: string
    textMessage?: string
  }
  authorDetails: {
    displayName: string
    profileImageUrl: string
    channelId: string
  }
}

export interface YouTubeLiveStream {
  id: string
  snippet: {
    title: string
    description: string
    publishedAt: string
  }
  liveStreamingDetails: {
    actualStartTime: string
    scheduledStartTime?: string
    concurrentViewers?: number
    activeLiveChatId: string
  }
}

export interface YouTubeApiResponse<T> {
  kind: string
  etag: string
  nextPageToken?: string
  pageInfo: {
    totalResults: number
    resultsPerPage: number
  }
  items: T[]
}
