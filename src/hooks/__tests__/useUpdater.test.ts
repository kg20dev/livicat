import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useUpdater } from '../useUpdater'

// Mock Tauri plugins
const mockCheck = vi.fn()
const mockRelaunch = vi.fn()

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: (...args: unknown[]) => mockCheck(...args),
}))

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: (...args: unknown[]) => mockRelaunch(...args),
}))

describe('useUpdater', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes and completes check on mount', async () => {
    mockCheck.mockResolvedValue(null)

    const { result } = renderHook(() => useUpdater())

    await waitFor(() => {
      expect(result.current.checking).toBe(false)
    })

    expect(result.current.updateAvailable).toBe(false)
    expect(result.current.updateInfo).toBeNull()
    expect(result.current.downloading).toBe(false)
    expect(result.current.downloadProgress).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('checks for updates on mount', async () => {
    mockCheck.mockResolvedValue(null)

    renderHook(() => useUpdater())

    await waitFor(() => {
      expect(mockCheck).toHaveBeenCalledTimes(1)
    })
  })

  it('sets updateAvailable when update is found', async () => {
    const mockUpdate = {
      version: '1.0.0',
      date: '2026-01-01',
      body: 'Test update',
      downloadAndInstall: vi.fn().mockResolvedValue(undefined),
    }
    mockCheck.mockResolvedValue(mockUpdate)

    const { result } = renderHook(() => useUpdater())

    await waitFor(() => {
      expect(result.current.updateAvailable).toBe(true)
      expect(result.current.updateInfo).toBe(mockUpdate)
    })
  })

  it('sets updateAvailable to false when no update found', async () => {
    mockCheck.mockResolvedValue(null)

    const { result } = renderHook(() => useUpdater())

    await waitFor(() => {
      expect(result.current.updateAvailable).toBe(false)
      expect(result.current.updateInfo).toBeNull()
    })
  })

  it('sets error when check fails', async () => {
    mockCheck.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useUpdater())

    await waitFor(() => {
      expect(result.current.error).toBe('Network error')
      expect(result.current.updateAvailable).toBe(false)
    })
  })

  it('sets error for non-Error exceptions', async () => {
    mockCheck.mockRejectedValue('string error')

    const { result } = renderHook(() => useUpdater())

    await waitFor(() => {
      expect(result.current.error).toBe('string error')
    })
  })

  it('can manually trigger checkForUpdates', async () => {
    mockCheck.mockResolvedValue(null)

    const { result } = renderHook(() => useUpdater())

    // Wait for initial check
    await waitFor(() => {
      expect(mockCheck).toHaveBeenCalledTimes(1)
    })

    // Manual check
    await act(async () => {
      await result.current.checkForUpdates()
    })

    expect(mockCheck).toHaveBeenCalledTimes(2)
  })

  it('installs update when updateInfo is available', async () => {
    const mockDownloadAndInstall = vi.fn().mockImplementation((callback) => {
      // Simulate download progress events
      callback({ event: 'Started', data: { contentLength: 1000 } })
      callback({ event: 'Progress', data: { chunkLength: 500 } })
      callback({ event: 'Progress', data: { chunkLength: 500 } })
      callback({ event: 'Finished', data: {} })
      return Promise.resolve()
    })

    const mockUpdate = {
      version: '1.0.0',
      date: '2026-01-01',
      body: 'Test update',
      downloadAndInstall: mockDownloadAndInstall,
    }
    mockCheck.mockResolvedValue(mockUpdate)
    mockRelaunch.mockResolvedValue(undefined)

    const { result } = renderHook(() => useUpdater())

    await waitFor(() => {
      expect(result.current.updateAvailable).toBe(true)
    })

    await act(async () => {
      await result.current.installUpdate()
    })

    expect(mockDownloadAndInstall).toHaveBeenCalledTimes(1)
    expect(mockRelaunch).toHaveBeenCalledTimes(1)
  })

  it('does nothing on installUpdate when no update available', async () => {
    mockCheck.mockResolvedValue(null)

    const { result } = renderHook(() => useUpdater())

    await waitFor(() => {
      expect(result.current.updateAvailable).toBe(false)
    })

    await act(async () => {
      await result.current.installUpdate()
    })

    expect(mockRelaunch).not.toHaveBeenCalled()
  })

  it('sets error when installUpdate fails', async () => {
    const mockUpdate = {
      version: '1.0.0',
      date: '2026-01-01',
      body: 'Test update',
      downloadAndInstall: vi.fn().mockRejectedValue(new Error('Download failed')),
    }
    mockCheck.mockResolvedValue(mockUpdate)

    const { result } = renderHook(() => useUpdater())

    await waitFor(() => {
      expect(result.current.updateAvailable).toBe(true)
    })

    await act(async () => {
      await result.current.installUpdate()
    })

    expect(result.current.error).toBe('Download failed')
    expect(result.current.downloading).toBe(false)
  })

  it('tracks download progress', async () => {
    let progressCallback:
      | ((event: { event: string; data: Record<string, unknown> }) => void)
      | null = null

    const mockUpdate = {
      version: '1.0.0',
      date: '2026-01-01',
      body: 'Test update',
      downloadAndInstall: vi.fn().mockImplementation((callback) => {
        progressCallback = callback
        return Promise.resolve()
      }),
    }
    mockCheck.mockResolvedValue(mockUpdate)

    const { result } = renderHook(() => useUpdater())

    await waitFor(() => {
      expect(result.current.updateAvailable).toBe(true)
    })

    // Start download
    let installPromise: Promise<void>
    act(() => {
      installPromise = result.current.installUpdate()
    })

    // Simulate progress events
    await act(async () => {
      progressCallback!({ event: 'Started', data: { contentLength: 1000 } })
      progressCallback!({ event: 'Progress', data: { chunkLength: 250 } })
    })

    expect(result.current.downloading).toBe(true)
    expect(result.current.downloadProgress).toBe(25)

    await act(async () => {
      progressCallback!({ event: 'Progress', data: { chunkLength: 250 } })
    })

    expect(result.current.downloadProgress).toBe(50)

    await act(async () => {
      progressCallback!({ event: 'Finished', data: {} })
      await installPromise!
    })
  })

  it('provides stable callback references', () => {
    mockCheck.mockResolvedValue(null)

    const { result, rerender } = renderHook(() => useUpdater())

    const checkForUpdates1 = result.current.checkForUpdates
    const installUpdate1 = result.current.installUpdate

    rerender()

    expect(result.current.checkForUpdates).toBe(checkForUpdates1)
    expect(result.current.installUpdate).toBe(installUpdate1)
  })
})
