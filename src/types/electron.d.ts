/** Electron preload API exposed via contextBridge */
interface ElectronAPI {
  openChatPreview: (videoId: string, css: string) => void
  updateChatCSS: (css: string) => void
  closeChatPreview: () => void
  onPreviewClosed: (callback: () => void) => () => void
}

interface Window {
  electronAPI?: ElectronAPI
  __TAURI__?: unknown
}
