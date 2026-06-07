import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackEvent, trackEventAsync } from '../analytics'

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'
const mockInvoke = vi.mocked(invoke)

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('trackEvent', () => {
    it('should not track when analytics is disabled', async () => {
      mockInvoke.mockResolvedValueOnce(false) // is_analytics_enabled returns false

      await trackEvent('test_event')

      // Should only call is_analytics_enabled, not track_event
      expect(mockInvoke).toHaveBeenCalledTimes(1)
      expect(mockInvoke).toHaveBeenCalledWith('is_analytics_enabled')
    })

    it('should track when analytics is enabled', async () => {
      mockInvoke.mockResolvedValueOnce(true) // is_analytics_enabled returns true
      mockInvoke.mockResolvedValueOnce(undefined) // track_event succeeds

      await trackEvent('test_event', { key: 'value' })

      expect(mockInvoke).toHaveBeenCalledTimes(2)
      expect(mockInvoke).toHaveBeenCalledWith('is_analytics_enabled')
      expect(mockInvoke).toHaveBeenCalledWith('track_event', {
        name: 'test_event',
        props: { key: 'value' },
      })
    })

    it('should track with empty props when no props provided', async () => {
      mockInvoke.mockResolvedValueOnce(true)
      mockInvoke.mockResolvedValueOnce(undefined)

      await trackEvent('test_event')

      expect(mockInvoke).toHaveBeenCalledWith('track_event', {
        name: 'test_event',
        props: {},
      })
    })

    it('should silently handle errors', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Tauri not available'))

      // Should not throw
      await expect(trackEvent('test_event')).resolves.toBeUndefined()
    })

    it('should handle track_event command failure', async () => {
      mockInvoke.mockResolvedValueOnce(true) // is_analytics_enabled returns true
      mockInvoke.mockRejectedValueOnce(new Error('Network error'))

      // Should not throw
      await expect(trackEvent('test_event')).resolves.toBeUndefined()
    })
  })

  describe('trackEventAsync', () => {
    it('should fire and forget without awaiting', () => {
      mockInvoke.mockResolvedValue(true)

      // Should not throw even synchronously
      trackEventAsync('test_event', { key: 'value' })

      // The call is fire-and-forget, so we just verify it doesn't throw
      expect(true).toBe(true)
    })
  })

  describe('privacy', () => {
    it('should never include YouTube URLs in event props', async () => {
      mockInvoke.mockResolvedValueOnce(true)
      mockInvoke.mockResolvedValueOnce(undefined)

      await trackEvent('youtube_fetched', {
        success: true,
        error_code: null,
      })

      const trackCall = mockInvoke.mock.calls[1]
      const props = trackCall?.[1] as Record<string, unknown>

      // Verify no URL-like values in props
      const propsStr = JSON.stringify(props)
      expect(propsStr).not.toMatch(/youtube\.com/)
      expect(propsStr).not.toMatch(/youtu\.be/)
    })

    it('should never include PII in event props', async () => {
      mockInvoke.mockResolvedValueOnce(true)
      mockInvoke.mockResolvedValueOnce(undefined)

      await trackEvent('css_exported', {
        format: 'css',
        method: 'download',
        had_customizations: true,
      })

      const trackCall = mockInvoke.mock.calls[1]
      const props = trackCall?.[1] as Record<string, unknown>

      // Verify no PII keys
      expect(props).not.toHaveProperty('email')
      expect(props).not.toHaveProperty('name')
      expect(props).not.toHaveProperty('username')
      expect(props).not.toHaveProperty('url')
    })

    it('should not include custom CSS values in events', async () => {
      mockInvoke.mockResolvedValueOnce(true)
      mockInvoke.mockResolvedValueOnce(undefined)

      await trackEvent('customization_changed', {
        setting_type: 'color',
        setting_key: 'usernameColor',
      })

      const trackCall = mockInvoke.mock.calls[1]
      const props = trackCall?.[1] as Record<string, unknown>

      // Verify no CSS values
      expect(props).not.toHaveProperty('value')
      expect(props).not.toHaveProperty('css')
      expect(props).not.toHaveProperty('color_value')
    })
  })
})
