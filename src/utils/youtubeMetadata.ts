/**
 * Fetch YouTube video metadata using the public oEmbed API.
 *
 * This is NOT the YouTube Data API — no API key required, no CORS issues.
 * oEmbed is a public protocol used by Slack, Discord, WordPress, etc.
 * See: https://oembed.com/
 */

/* ─── Types ──────────────────────────────────────────────────────── */

export interface YouTubeVideoInfo {
  title: string
  authorName: string
  authorUrl: string
  thumbnailUrl: string
  isValid: boolean
  fetchedAt: number
}

export type YouTubeFetchResult =
  | { success: true; data: YouTubeVideoInfo }
  | { success: false; error: string }

/* ─── Fetcher ────────────────────────────────────────────────────── */

/**
 * Fetch video metadata from YouTube's public oEmbed API.
 * Shows a real network request in DevTools (unlike the iframe approach).
 *
 * @param videoId - 11-character YouTube video ID
 * @returns Video info on success, error message on failure
 */
export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeFetchResult> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`

  try {
    const response = await fetch(oembedUrl)

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Video not found. Check the URL and try again.' }
      }
      return {
        success: false,
        error: `YouTube returned error ${response.status}. Try again later.`,
      }
    }

    const data = await response.json()

    return {
      success: true,
      data: {
        title: data.title ?? 'Untitled Video',
        authorName: data.author_name ?? 'Unknown',
        authorUrl: data.author_url ?? '',
        thumbnailUrl: data.thumbnail_url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        isValid: true,
        fetchedAt: Date.now(),
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return {
      success: false,
      error: `Could not fetch video info: ${message}`,
    }
  }
}
