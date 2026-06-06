/**
 * YouTube URL validation and video ID extraction utility.
 */

/* ─── Types ──────────────────────────────────────────────────────── */

export interface YouTubeUrlValidation {
  /** Whether the URL is syntactically valid */
  isValid: boolean
  /** Extracted video ID, or null if not found */
  videoId: string | null
  /** User-friendly error message for invalid URLs */
  errorMessage?: string
}

/* ─── Validation ─────────────────────────────────────────────────── */

/**
 * Validate a YouTube URL and extract the video ID.
 *
 * Handles:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - Raw 11-character video IDs
 */
export function validateYouTubeUrl(input: string): YouTubeUrlValidation {
  if (!input || !input.trim()) {
    return { isValid: false, videoId: null, errorMessage: 'Please enter a YouTube URL' }
  }

  const trimmed = input.trim()

  // Raw 11-character ID
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return { isValid: true, videoId: trimmed }
  }

  let hostname: string
  let pathname: string
  let searchParams: URLSearchParams

  try {
    const url = new URL(trimmed)
    hostname = url.hostname
    pathname = url.pathname
    searchParams = url.searchParams
  } catch {
    return {
      isValid: false,
      videoId: null,
      errorMessage:
        'Invalid URL format. Use a YouTube link like:\nhttps://www.youtube.com/watch?v=...',
    }
  }

  // Check if it's a YouTube domain
  const isYouTube =
    hostname.includes('youtube.com') ||
    hostname.includes('youtu.be') ||
    hostname.includes('youtube-nocookie.com')

  if (!isYouTube) {
    return {
      isValid: false,
      videoId: null,
      errorMessage: 'Not a valid YouTube URL. Please enter a YouTube video or livestream link.',
    }
  }

  // youtu.be/VIDEO_ID
  if (hostname === 'youtu.be') {
    const id = pathname.slice(1).split('/')[0]
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
      return { isValid: true, videoId: id }
    }
    return {
      isValid: false,
      videoId: null,
      errorMessage: 'Could not find a video ID in that YouTube link.',
    }
  }

  // youtube.com/watch?v=VIDEO_ID
  const v = searchParams.get('v')
  if (v) {
    if (/^[A-Za-z0-9_-]{11}$/.test(v)) {
      return { isValid: true, videoId: v }
    }
    return {
      isValid: false,
      videoId: null,
      errorMessage: 'The video ID in the URL appears to be invalid.',
    }
  }

  // youtube.com/embed/VIDEO_ID or youtube.com/live/VIDEO_ID
  const pathParts = pathname.split('/').filter(Boolean)
  const embedIndex = pathParts.indexOf('embed')
  if (embedIndex !== -1) {
    const id = pathParts[embedIndex + 1]
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
      return { isValid: true, videoId: id }
    }
  }
  const liveIndex = pathParts.indexOf('live')
  if (liveIndex !== -1) {
    const id = pathParts[liveIndex + 1]
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
      return { isValid: true, videoId: id }
    }
  }

  return {
    isValid: false,
    videoId: null,
    errorMessage: 'Could not find a video ID in that YouTube link.',
  }
}
