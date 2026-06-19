import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TauriService } from '../TauriService'

// ─── Module mocks ──────────────────────────────────────────────────────

const mockInvoke = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}))

// ─── Tests ─────────────────────────────────────────────────────────────

describe('TauriService', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  // ── getAppVersion ────────────────────────────────────────────────

  describe('getAppVersion', () => {
    it('returns the version from the Rust binary when Tauri is available', async () => {
      mockInvoke.mockResolvedValue('0.7.7')
      await expect(TauriService.getAppVersion()).resolves.toBe('0.7.7')
      expect(mockInvoke).toHaveBeenCalledExactlyOnceWith('get_app_version')
    })

    it('returns null when Tauri is not available (invoke rejects)', async () => {
      mockInvoke.mockRejectedValue(new Error('Tauri not available'))
      await expect(TauriService.getAppVersion()).resolves.toBeNull()
    })
  })

  // ── openPreviewWindow ────────────────────────────────────────────

  describe('openPreviewWindow', () => {
    it('returns true when the window opens successfully', async () => {
      mockInvoke.mockResolvedValue(undefined)
      const result = await TauriService.openPreviewWindow('video123', '.chat { color: red }')
      expect(result).toBe(true)
      expect(mockInvoke).toHaveBeenCalledExactlyOnceWith('open_preview_window', {
        videoId: 'video123',
        css: '.chat { color: red }',
        alwaysOnTop: false,
      })
    })

    it('returns false when Tauri is not available', async () => {
      mockInvoke.mockRejectedValue(new Error('not available'))
      await expect(TauriService.openPreviewWindow('x', '')).resolves.toBe(false)
    })

    it('returns false when the Tauri command errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Failed to create window'))
      await expect(TauriService.openPreviewWindow('x', '')).resolves.toBe(false)
    })
  })

  // ── injectCss ────────────────────────────────────────────────────

  describe('injectCss', () => {
    it('returns true when CSS is injected successfully', async () => {
      mockInvoke.mockResolvedValue(undefined)
      await expect(TauriService.injectCss('body {}')).resolves.toBe(true)
      expect(mockInvoke).toHaveBeenCalledExactlyOnceWith('inject_css', {
        css: 'body {}',
        alwaysOnTop: false,
      })
    })

    it('returns false on failure', async () => {
      mockInvoke.mockRejectedValue(new Error('injection failed'))
      await expect(TauriService.injectCss('body {}')).resolves.toBe(false)
    })
  })

  // ── closePreviewWindow ───────────────────────────────────────────

  describe('closePreviewWindow', () => {
    it('returns true when the window closes successfully', async () => {
      mockInvoke.mockResolvedValue(undefined)
      await expect(TauriService.closePreviewWindow()).resolves.toBe(true)
      expect(mockInvoke).toHaveBeenCalledExactlyOnceWith('close_preview_window')
    })

    it('returns false on failure', async () => {
      mockInvoke.mockRejectedValue(new Error('close failed'))
      await expect(TauriService.closePreviewWindow()).resolves.toBe(false)
    })
  })

  // ── triggerCrashTest ─────────────────────────────────────────────

  describe('triggerCrashTest', () => {
    it('returns true for a valid crash type', async () => {
      mockInvoke.mockResolvedValue(undefined)
      await expect(TauriService.triggerCrashTest('fake_crash')).resolves.toBe(true)
      expect(mockInvoke).toHaveBeenCalledExactlyOnceWith('trigger_crash_test', {
        crashType: 'fake_crash',
      })
    })

    it('returns false on failure', async () => {
      mockInvoke.mockRejectedValue(new Error('trigger failed'))
      await expect(TauriService.triggerCrashTest('panic')).resolves.toBe(false)
    })
  })

  // ── Lazy init (invoke cached after first call) ───────────────────

  describe('lazy initialization', () => {
    it('caches the invoke function after first call', async () => {
      mockInvoke.mockResolvedValue('1.0.0')
      await TauriService.getAppVersion()
      expect(mockInvoke).toHaveBeenCalledTimes(1)

      // Second call uses cache, same mock
      mockInvoke.mockResolvedValue('2.0.0')
      await TauriService.getAppVersion()
      expect(mockInvoke).toHaveBeenCalledTimes(2)
    })
  })
})
