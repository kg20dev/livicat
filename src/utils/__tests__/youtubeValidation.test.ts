import { describe, it, expect } from 'vitest'
import { validateYouTubeUrl } from '../youtubeValidation'

describe('validateYouTubeUrl', () => {
  it('accepts a raw 11-char video ID', () => {
    const result = validateYouTubeUrl('dQw4w9WgXcQ')
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('dQw4w9WgXcQ')
  })

  it('accepts a standard youtube.com/watch URL', () => {
    const result = validateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('dQw4w9WgXcQ')
  })

  it('accepts a youtu.be short URL', () => {
    const result = validateYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('dQw4w9WgXcQ')
  })

  it('accepts a youtube.com/embed URL', () => {
    const result = validateYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('dQw4w9WgXcQ')
  })

  it('accepts a youtube.com/live URL', () => {
    const result = validateYouTubeUrl('https://www.youtube.com/live/dQw4w9WgXcQ')
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('dQw4w9WgXcQ')
  })

  it('rejects an empty string', () => {
    const result = validateYouTubeUrl('')
    expect(result.isValid).toBe(false)
    expect(result.videoId).toBeNull()
    expect(result.errorMessage).toBeTruthy()
  })

  it('rejects a non-YouTube URL', () => {
    const result = validateYouTubeUrl('https://example.com/video')
    expect(result.isValid).toBe(false)
    expect(result.videoId).toBeNull()
    expect(result.errorMessage).toContain('Not a valid YouTube URL')
  })

  it('rejects garbage text', () => {
    const result = validateYouTubeUrl('not a url at all !!!')
    expect(result.isValid).toBe(false)
    expect(result.videoId).toBeNull()
  })

  it('rejects a youtu.be URL with no ID', () => {
    const result = validateYouTubeUrl('https://youtu.be/')
    expect(result.isValid).toBe(false)
    expect(result.videoId).toBeNull()
  })

  it('rejects a youtube.com URL with no v param', () => {
    const result = validateYouTubeUrl('https://www.youtube.com/watch')
    expect(result.isValid).toBe(false)
    expect(result.videoId).toBeNull()
  })

  it('accepts youtube-nocookie.com URLs', () => {
    const result = validateYouTubeUrl('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(result.isValid).toBe(true)
    expect(result.videoId).toBe('dQw4w9WgXcQ')
  })
})
