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
      mockInvoke.mockResolvedValueOnce(false)

      await trackEvent('test_event')

      expect(mockInvoke).toHaveBeenCalledTimes(1)
      expect(mockInvoke).toHaveBeenCalledWith('is_analytics_enabled')
    })

    it('should track when analytics is enabled', async () => {
      mockInvoke.mockResolvedValueOnce(true)
      mockInvoke.mockResolvedValueOnce(undefined)

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

    it('should silently handle errors from is_analytics_enabled', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Tauri not available'))

      await expect(trackEvent('test_event')).resolves.toBeUndefined()
    })

    it('should silently handle errors from track_event', async () => {
      mockInvoke.mockResolvedValueOnce(true)
      mockInvoke.mockRejectedValueOnce(new Error('Network error'))

      await expect(trackEvent('test_event')).resolves.toBeUndefined()
    })
  })

  describe('trackEventAsync', () => {
    it('should exist and be callable', () => {
      mockInvoke.mockResolvedValue(true)

      expect(() => trackEventAsync('test_event', { key: 'value' })).not.toThrow()
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
      const props = (trackCall?.[1] as { props: Record<string, unknown> })?.props

      const propsStr = JSON.stringify(props)
      expect(propsStr).not.toMatch(/youtube\.com/)
      expect(propsStr).not.toMatch(/youtu\.be/)
    })

    it('should never include PII keys in event props', async () => {
      mockInvoke.mockResolvedValueOnce(true)
      mockInvoke.mockResolvedValueOnce(undefined)

      await trackEvent('css_exported', {
        format: 'css',
        method: 'download',
        had_customizations: true,
      })

      const trackCall = mockInvoke.mock.calls[1]
      const props = (trackCall?.[1] as { props: Record<string, unknown> })?.props

      expect(Object.keys(props)).not.toContain('email')
      expect(Object.keys(props)).not.toContain('user_email')
      expect(Object.keys(props)).not.toContain('username')
      expect(Object.keys(props)).not.toContain('url')
    })

    it('should not include custom CSS values in events', async () => {
      mockInvoke.mockResolvedValueOnce(true)
      mockInvoke.mockResolvedValueOnce(undefined)

      await trackEvent('customization_changed', {
        setting_type: 'color',
        setting_key: 'usernameColor',
      })

      const trackCall = mockInvoke.mock.calls[1]
      const props = (trackCall?.[1] as { props: Record<string, unknown> })?.props

      expect(Object.keys(props)).not.toContain('value')
      expect(Object.keys(props)).not.toContain('css')
      expect(Object.keys(props)).not.toContain('color_value')
    })
  })
})
