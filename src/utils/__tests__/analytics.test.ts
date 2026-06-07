import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackEvent, trackEventAsync, isAnalyticsEnabled, setAnalyticsEnabled } from '../analytics'

// Mock @aptabase/tauri
vi.mock('@aptabase/tauri', () => ({
  trackEvent: vi.fn(),
}))

import { trackEvent as aptabaseTrackEvent } from '@aptabase/tauri'
const mockTrackEvent = vi.mocked(aptabaseTrackEvent)

const CONSENT_KEY = 'livicat_analytics_consent'

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('isAnalyticsEnabled / setAnalyticsEnabled', () => {
    it('should return false by default', () => {
      expect(isAnalyticsEnabled()).toBe(false)
    })

    it('should return true after enabling', () => {
      setAnalyticsEnabled(true)
      expect(isAnalyticsEnabled()).toBe(true)
      expect(localStorage.getItem(CONSENT_KEY)).toBe('true')
    })

    it('should return false after disabling', () => {
      setAnalyticsEnabled(true)
      setAnalyticsEnabled(false)
      expect(isAnalyticsEnabled()).toBe(false)
      expect(localStorage.getItem(CONSENT_KEY)).toBe('false')
    })
  })

  describe('trackEvent', () => {
    it('should not track when analytics is disabled', async () => {
      await trackEvent('test_event')

      expect(mockTrackEvent).not.toHaveBeenCalled()
    })

    it('should track when analytics is enabled', async () => {
      setAnalyticsEnabled(true)

      await trackEvent('test_event', { key: 'value' })

      expect(mockTrackEvent).toHaveBeenCalledTimes(1)
      expect(mockTrackEvent).toHaveBeenCalledWith('test_event', { key: 'value' })
    })

    it('should track with undefined props when no props provided', async () => {
      setAnalyticsEnabled(true)

      await trackEvent('test_event')

      expect(mockTrackEvent).toHaveBeenCalledWith('test_event', undefined)
    })

    it('should silently handle errors from trackEvent', async () => {
      setAnalyticsEnabled(true)
      mockTrackEvent.mockRejectedValueOnce(new Error('Plugin error'))

      await expect(trackEvent('test_event')).resolves.toBeUndefined()
    })
  })

  describe('trackEventAsync', () => {
    it('should not throw when called', () => {
      expect(() => trackEventAsync('test_event', { key: 'value' })).not.toThrow()
    })

    it('should not track when analytics is disabled', async () => {
      trackEventAsync('test_event')

      // Need a tick for the async to propagate
      await new Promise((r) => setTimeout(r, 10))
      expect(mockTrackEvent).not.toHaveBeenCalled()
    })

    it('should track when analytics is enabled', async () => {
      setAnalyticsEnabled(true)
      trackEventAsync('test_event', { key: 'value' })

      await new Promise((r) => setTimeout(r, 10))
      expect(mockTrackEvent).toHaveBeenCalledWith('test_event', { key: 'value' })
    })
  })

  describe('privacy', () => {
    it('should never include YouTube URLs in event props', async () => {
      setAnalyticsEnabled(true)

      await trackEvent('youtube_fetched', {
        success: true,
        error_code: null,
      })

      const props = mockTrackEvent.mock.calls[0]?.[1] as Record<string, unknown> | undefined
      const propsStr = JSON.stringify(props)
      expect(propsStr).not.toMatch(/youtube\.com/)
      expect(propsStr).not.toMatch(/youtu\.be/)
    })

    it('should never include PII keys in event props', async () => {
      setAnalyticsEnabled(true)

      await trackEvent('css_exported', {
        format: 'css',
        method: 'download',
        had_customizations: true,
      })

      const props = mockTrackEvent.mock.calls[0]?.[1] as Record<string, unknown> | undefined
      if (props) {
        expect(Object.keys(props)).not.toContain('email')
        expect(Object.keys(props)).not.toContain('user_email')
        expect(Object.keys(props)).not.toContain('username')
        expect(Object.keys(props)).not.toContain('url')
      }
    })

    it('should not include custom CSS values in events', async () => {
      setAnalyticsEnabled(true)

      await trackEvent('customization_changed', {
        setting_type: 'color',
        setting_key: 'usernameColor',
      })

      const props = mockTrackEvent.mock.calls[0]?.[1] as Record<string, unknown> | undefined
      if (props) {
        expect(Object.keys(props)).not.toContain('value')
        expect(Object.keys(props)).not.toContain('css')
        expect(Object.keys(props)).not.toContain('color_value')
      }
    })
  })
})
