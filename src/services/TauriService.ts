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

  /** Fetch available scenes from OBS */
  async getScenes(obsUrl: string, obsPassword?: string): Promise<string[] | null> {
    const invoke = await getInvoke()
    if (!invoke) return null
    try {
      return await invoke<string[]>('obs_get_scenes', {
        obsUrl,
        obsPassword: obsPassword ?? null,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[TauriService] getScenes failed:', msg)
      // Throw with the full Rust error message so the UI can display it
      throw new Error(msg)
    }
  },

  /** Send chat to OBS / PRISM as a Browser Source via WebSocket */
  async sendBrowserSource(params: {
    obsUrl: string
    obsPassword?: string
    videoId: string
    css: string
    sourceName?: string
    sceneName?: string
    width?: number
    height?: number
    proxyUrl?: string
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
        sceneName: params.sceneName ?? null,
        width: params.width ?? 400,
        height: params.height ?? 600,
        proxyUrl: params.proxyUrl ?? null,
      })
    } catch (e) {
      console.error('[TauriService] sendBrowserSource failed:', e)
      return null
    }
  },

  /** Remove the Livicat browser source from OBS via WebSocket */
  async removeBrowserSource(
    obsUrl: string,
    obsPassword?: string,
    sourceName?: string
  ): Promise<boolean> {
    const invoke = await getInvoke()
    if (!invoke) return false
    try {
      await invoke('obs_remove_browser_source', {
        obsUrl,
        obsPassword: obsPassword ?? null,
        sourceName: sourceName ?? null,
      })
      return true
    } catch (e) {
      console.error('[TauriService] removeBrowserSource failed:', e)
      return false
    }
  },

  /* ─── WebView Chat System ────────────────────────────────────── */

  /** Start the chat capture system (renderer + hidden WebView).
   *  The hidden WebView navigates to YouTube live chat, injects CSS,
   *  and captures messages via a MutationObserver. Captured messages
   *  are sent to the renderer, which serves them via HTTP for OBS.
   *  Returns the renderer port for OBS to connect to. */
  async startChat(videoId: string, css: string, hideAtsign: boolean): Promise<number | null> {
    const invoke = await getInvoke()
    if (!invoke) return null
    try {
      return await invoke<number>('start_chat', { videoId, css, hideAtsign })
    } catch (e) {
      console.error('[TauriService] startChat failed:', e)
      return null
    }
  },

  /** Stop the chat capture system and clean up all resources. */
  async stopChat(): Promise<boolean> {
    const invoke = await getInvoke()
    if (!invoke) return false
    try {
      await invoke('stop_chat')
      return true
    } catch (e) {
      console.error('[TauriService] stopChat failed:', e)
      return false
    }
  },

  /** Live-update the renderer's CSS without restarting the stream.
   *  Proxies CSS through Rust to bypass the WebView's CSP which
   *  blocks direct fetch from the frontend to http://127.0.0.1:{port}. */
  async updateRendererCss(css: string): Promise<boolean> {
    const invoke = await getInvoke()
    if (!invoke) return false
    try {
      await invoke('update_renderer_css', { css })
      return true
    } catch (e) {
      console.error('[TauriService] updateRendererCss failed:', e)
      return false
    }
  },
}
