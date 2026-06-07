import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackEvent, trackEventAsync, isAnalyticsEnabled, setAnalyticsEnabled } from '../analytics'

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'
const mockInvoke = vi.mocked(invoke)

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

      expect(mockInvoke).not.toHaveBeenCalled()
    })

    it('should track when analytics is enabled', async () => {
      setAnalyticsEnabled(true)
      mockInvoke.mockResolvedValueOnce(undefined)

      await trackEvent('test_event', { key: 'value' })

      expect(mockInvoke).toHaveBeenCalledTimes(1)
      expect(mockInvoke).toHaveBeenCalledWith('track_event', {
        name: 'test_event',
        props: { key: 'value' },
      })
    })

    it('should track with empty props when no props provided', async () => {
      setAnalyticsEnabled(true)
      mockInvoke.mockResolvedValueOnce(undefined)

      await trackEvent('test_event')

      expect(mockInvoke).toHaveBeenCalledWith('track_event', {
        name: 'test_event',
        props: {},
      })
    })

    it('should silently handle errors from invoke', async () => {
      setAnalyticsEnabled(true)
      mockInvoke.mockRejectedValueOnce(new Error('Tauri error'))

      await expect(trackEvent('test_event')).resolves.toBeUndefined()
    })
  })

  describe('trackEventAsync', () => {
    it('should not throw when called', () => {
      expect(() => trackEventAsync('test_event', { key: 'value' })).not.toThrow()
    })

    it('should not track when analytics is disabled', async () => {
      trackEventAsync('test_event')

      await new Promise((r) => setTimeout(r, 10))
      expect(mockInvoke).not.toHaveBeenCalled()
    })

    it('should track when analytics is enabled', async () => {
      setAnalyticsEnabled(true)
      mockInvoke.mockResolvedValueOnce(undefined)
      trackEventAsync('test_event', { key: 'value' })

      await new Promise((r) => setTimeout(r, 10))
      expect(mockInvoke).toHaveBeenCalledWith('track_event', {
        name: 'test_event',
        props: { key: 'value' },
      })
    })
  })

  describe('privacy', () => {
    it('should never include YouTube URLs in event props', async () => {
      setAnalyticsEnabled(true)
      mockInvoke.mockResolvedValueOnce(undefined)

      await trackEvent('youtube_fetched', {
        success: true,
        error_code: null,
      })

      const props = mockInvoke.mock.calls[0]?.[1] as { props: Record<string, unknown> } | undefined
      if (props) {
        const propsStr = JSON.stringify(props.props)
        expect(propsStr).not.toMatch(/youtube\.com/)
        expect(propsStr).not.toMatch(/youtu\.be/)
      }
    })

    it('should never include PII keys in event props', async () => {
      setAnalyticsEnabled(true)
      mockInvoke.mockResolvedValueOnce(undefined)

      await trackEvent('css_exported', {
        format: 'css',
        method: 'download',
        had_customizations: true,
      })

      const props = mockInvoke.mock.calls[0]?.[1] as { props: Record<string, unknown> } | undefined
      if (props && props.props) {
        expect(Object.keys(props.props)).not.toContain('email')
        expect(Object.keys(props.props)).not.toContain('user_email')
        expect(Object.keys(props.props)).not.toContain('username')
        expect(Object.keys(props.props)).not.toContain('url')
      }
    })

    it('should not include custom CSS values in events', async () => {
      setAnalyticsEnabled(true)
      mockInvoke.mockResolvedValueOnce(undefined)

      await trackEvent('customization_changed', {
        setting_type: 'color',
        setting_key: 'usernameColor',
      })

      const props = mockInvoke.mock.calls[0]?.[1] as { props: Record<string, unknown> } | undefined
      if (props && props.props) {
        expect(Object.keys(props.props)).not.toContain('value')
        expect(Object.keys(props.props)).not.toContain('css')
        expect(Object.keys(props.props)).not.toContain('color_value')
      }
    })
  })
})
