/**
 * Tauri IPC Service
 *
 * Centralizes all Tauri invoke calls so no component imports `@tauri-apps/api`
 * directly. This makes it easy to swap implementations (web fallback, test mock)
 * and keeps components framework-agnostic.
 *
 * Each method returns a result — if Tauri is not available (web dev mode),
 * methods return `null` (query) or `false` (command) instead of throwing.
 */

type Invoke = typeof import('@tauri-apps/api/core').invoke

let _invoke: Invoke | undefined | null

async function getInvoke(): Promise<Invoke | null> {
  if (_invoke !== undefined) return _invoke
  try {
    const mod = await import('@tauri-apps/api/core')
    _invoke = mod.invoke
    return _invoke
  } catch {
    _invoke = null
    return null
  }
}

export const TauriService = {
  /** Read the app version from the Rust binary at compile time */
  async getAppVersion(): Promise<string | null> {
    const invoke = await getInvoke()
    if (!invoke) return null
    try {
      return await invoke<string>('get_app_version')
    } catch {
      return null
    }
  },

  /** Open the YouTube live chat preview window and inject CSS */
  async openPreviewWindow(
    videoId: string,
    css: string,
    alwaysOnTop = false,
    autoScroll = true
  ): Promise<boolean> {
    const invoke = await getInvoke()
    if (!invoke) return false
    try {
      await invoke('open_preview_window', { videoId, css, alwaysOnTop, autoScroll })
      return true
    } catch (e) {
      console.error('[TauriService] openPreviewWindow failed:', e)
      return false
    }
  },

  /** Re-inject CSS into an existing preview window */
  async injectCss(css: string, alwaysOnTop = false, autoScroll = true): Promise<boolean> {
    const invoke = await getInvoke()
    if (!invoke) return false
    try {
      await invoke('inject_css', { css, alwaysOnTop, autoScroll })
      return true
    } catch (e) {
      console.error('[TauriService] injectCss failed:', e)
      return false
    }
  },

  /** Close the preview window */
  async closePreviewWindow(): Promise<boolean> {
    const invoke = await getInvoke()
    if (!invoke) return false
    try {
      await invoke('close_preview_window')
      return true
    } catch (e) {
      console.error('[TauriService] closePreviewWindow failed:', e)
      return false
    }
  },

  /** Trigger a crash test (for Sentry verification) */
  async triggerCrashTest(
    crashType: 'panic' | 'fake_crash' | 'fake_error' | 'scenario'
  ): Promise<boolean> {
    const invoke = await getInvoke()
    if (!invoke) return false
    try {
      await invoke('trigger_crash_test', { crashType })
      return true
    } catch (e) {
      console.error('[TauriService] triggerCrashTest failed:', e)
      return false
    }
  },

  /* ─── OBS / PRISM Integration ────────────────────────────────── */

  /** Detect if OBS or PRISM is running with WebSocket enabled */
  async detectStreamingApp(): Promise<{ detected: 'obs_compatible' | 'none' } | null> {
    const invoke = await getInvoke()
    if (!invoke) return null
    try {
      return await invoke<{ detected: 'obs_compatible' | 'none' }>('detect_streaming_app')
    } catch (e) {
      console.error('[TauriService] detectStreamingApp failed:', e)
      return null
    }
  },

  /** Send chat to OBS / PRISM as a Browser Source via WebSocket */
  async sendBrowserSource(params: {
    obsUrl: string
    obsPassword?: string
    videoId: string
    css: string
    sourceName?: string
    width?: number
    height?: number
  }): Promise<'created' | 'updated' | null> {
    const invoke = await getInvoke()
    if (!invoke) return null
    try {
      return await invoke<'created' | 'updated'>('obs_send_browser_source', {
        obsUrl: params.obsUrl,
        obsPassword: params.obsPassword ?? null,
        videoId: params.videoId,
        css: params.css,
        sourceName: params.sourceName ?? null,
        width: params.width ?? 400,
        height: params.height ?? 600,
      })
    } catch (e) {
      console.error('[TauriService] sendBrowserSource failed:', e)
      return null
    }
  },

  /** Start local HTTP chat server (fallback for PRISM/Streamlabs) */
  async startChatServer(videoId: string, css: string): Promise<number | null> {
    const invoke = await getInvoke()
    if (!invoke) return null
    try {
      return await invoke<number>('start_chat_server', { videoId, css })
    } catch (e) {
      console.error('[TauriService] startChatServer failed:', e)
      return null
    }
  },
}
