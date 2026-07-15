import { useState, useEffect, useCallback } from 'react'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

interface UpdaterState {
  checking: boolean
  updateAvailable: boolean
  updateInfo: Update | null
  downloading: boolean
  downloadProgress: number
  error: string | null
}

/**
 * Hook to check for app updates and handle the update flow.
 *
 * Usage:
 * ```tsx
 * const { checking, updateAvailable, updateInfo, downloading, downloadProgress, error, checkForUpdates, installUpdate } = useUpdater();
 * ```
 */
export function useUpdater() {
  const [state, setState] = useState<UpdaterState>({
    checking: false,
    updateAvailable: false,
    updateInfo: null,
    downloading: false,
    downloadProgress: 0,
    error: null,
  })

  const checkForUpdates = useCallback(async () => {
    setState((s) => ({ ...s, checking: true, error: null }))
    try {
      const update = await check()
      if (update) {
        setState((s) => ({
          ...s,
          checking: false,
          updateAvailable: true,
          updateInfo: update,
        }))
      } else {
        setState((s) => ({
          ...s,
          checking: false,
          updateAvailable: false,
          updateInfo: null,
        }))
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        checking: false,
        error: err instanceof Error ? err.message : String(err),
      }))
    }
  }, [])

  const installUpdate = useCallback(async () => {
    const update = state.updateInfo
    if (!update) return

    setState((s) => ({ ...s, downloading: true, downloadProgress: 0, error: null }))
    try {
      let downloaded = 0
      let contentLength = 0

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0
            break
          case 'Progress':
            downloaded += event.data.chunkLength
            break
          case 'Finished':
            break
        }
        if (contentLength > 0) {
          setState((s) => ({
            ...s,
            downloadProgress: Math.round((downloaded / contentLength) * 100),
          }))
        }
      })

      await relaunch()
    } catch (err) {
      setState((s) => ({
        ...s,
        downloading: false,
        error: err instanceof Error ? err.message : String(err),
      }))
    }
  }, [state.updateInfo])

  // Check for updates on mount
  useEffect(() => {
    checkForUpdates()
  }, [checkForUpdates])

  return {
    ...state,
    checkForUpdates,
    installUpdate,
  }
}
