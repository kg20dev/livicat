const { contextBridge, ipcRenderer } = require('electron')

/**
 * Secure IPC bridge between Electron main process and the React renderer.
 * Exposed as `window.electronAPI` — only available when running in Electron.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /** Open a preview window showing YouTube live chat with injected CSS */
  openChatPreview: (videoId, css) => {
    ipcRenderer.send('open-chat-preview', { videoId, css })
  },

  /** Update the CSS in the preview window (for live editing) */
  updateChatCSS: (css) => {
    ipcRenderer.send('update-chat-css', { css })
  },

  /** Close the preview window */
  closeChatPreview: () => {
    ipcRenderer.send('close-chat-preview')
  },

  /** Listen for preview window being closed by the user */
  onPreviewClosed: (callback) => {
    ipcRenderer.on('preview-closed', callback)
    return () => {
      ipcRenderer.removeListener('preview-closed', callback)
    }
  },
})
