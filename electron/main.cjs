const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')

/* ─── Constants ──────────────────────────────────────────────────── */

const isPackaged = app.isPackaged
const PRELOAD_PATH = path.join(__dirname, 'preload.cjs')

/* ─── Main Window (app UI) ──────────────────────────────────────── */

/** @type {BrowserWindow | null} */
let mainWindow = null

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 500,
    title: 'Livicat',
    show: false, // Prevent white flash — show on ready-to-show
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true, // SECURITY: never disable
      sandbox: true, // SECURITY: never disable
      nodeIntegration: false, // SECURITY: never enable
      webviewTag: false, // SECURITY: disable unless needed
    },
  })

  // Show window only when content is ready (prevents white flash)
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Block navigation to external URLs in the main window
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = url.startsWith('file://') || url.startsWith('http://localhost:')
    if (!allowed) {
      event.preventDefault()
      console.warn('[Livicat] Blocked navigation to:', url)
    }
  })

  // Open external links in system browser instead of new Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Disable DevTools in production
  if (isPackaged) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
        event.preventDefault()
      }
    })
  }

  // Load the app
  if (!isPackaged) {
    // Development mode
    const distPath = path.join(__dirname, '../dist/index.html')
    if (fs.existsSync(distPath) && process.env.LIVICAT_PROD === 'true') {
      mainWindow.loadFile(distPath)
      console.log('[Livicat] Running in production build mode')
    } else if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath)
      console.log('[Livicat] Auto-detected production build, loading from dist/')
    } else {
      mainWindow.loadURL('http://localhost:3000')
      mainWindow.webContents.openDevTools({ mode: 'detach' })
      console.log('[Livicat] Running in dev server mode')
    }
  } else {
    // Packaged app — dist is placed via extraResources outside app.asar
    const distPath = path.join(process.resourcesPath, 'dist', 'index.html')
    mainWindow.loadFile(distPath)
    console.log('[Livicat] Running in packaged mode')
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/* ─── Preview Window (YouTube chat + CSS injection) ──────────────── */

/** @type {BrowserWindow | null} */
let previewWindow = null
let currentVideoId = null

function openPreviewWindow(videoId, css) {
  // Reuse existing preview window if same video
  if (previewWindow && !previewWindow.isDestroyed()) {
    if (currentVideoId === videoId) {
      // Same video → just inject CSS and focus
      injectCSSToPreview(css)
      previewWindow.focus()
      return
    }
    // Different video → close and reopen
    closePreviewWindow()
  }

  currentVideoId = videoId
  const chatUrl = `https://www.youtube.com/live_chat?is_popout=1&v=${videoId}`

  previewWindow = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 320,
    minHeight: 480,
    title: 'Livicat — Live Chat Preview',
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true, // SECURITY: never disable
      sandbox: true, // SECURITY: never disable
      nodeIntegration: false, // SECURITY: never enable
    },
  })

  previewWindow.loadURL(chatUrl)

  // Inject CSS after the page finishes loading
  previewWindow.webContents.on('did-finish-load', () => {
    console.log('[Livicat] Preview loaded:', chatUrl)
    injectCSSToPreview(css)
  })

  previewWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Livicat] Preview failed to load:', errorCode, errorDescription)
  })

  // Notify renderer when preview is closed
  previewWindow.on('closed', () => {
    previewWindow = null
    currentVideoId = null
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('preview-closed')
    }
  })
}

function injectCSSToPreview(css) {
  if (!previewWindow || previewWindow.isDestroyed() || !css) {
    console.log('[Livicat] injectCSS skipped:', {
      hasWindow: !!previewWindow,
      cssLength: css?.length,
    })
    return
  }

  console.log('[Livicat] Injecting CSS, length:', css.length)

  const script = `
    (function() {
      try {
        var existing = document.getElementById('livicat-css');
        if (existing) existing.remove();
        if (!${JSON.stringify(css)}) return;
        var style = document.createElement('style');
        style.id = 'livicat-css';
        style.textContent = ${JSON.stringify(css)};
        document.head.appendChild(style);
        console.log('[Livicat] CSS injected successfully');
      } catch(e) {
        console.error('[Livicat] CSS injection error:', e);
      }
    })();
  `
  previewWindow.webContents.executeJavaScript(script).catch((err) => {
    console.error('[Livicat] executeJavaScript failed:', err.message)
  })
}

function closePreviewWindow() {
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.close()
  }
  previewWindow = null
  currentVideoId = null
}

/* ─── IPC Handlers (with argument validation) ───────────────────── */

ipcMain.on('open-chat-preview', (_event, args) => {
  // Validate arguments
  if (!args || typeof args !== 'object') return
  const { videoId, css } = args
  if (typeof videoId !== 'string' || videoId.length === 0 || videoId.length > 20) return
  if (css !== undefined && typeof css !== 'string') return
  openPreviewWindow(videoId, css || '')
})

ipcMain.on('update-chat-css', (_event, args) => {
  if (!args || typeof args !== 'object') return
  const { css } = args
  if (typeof css !== 'string') return
  injectCSSToPreview(css)
})

ipcMain.on('close-chat-preview', () => {
  closePreviewWindow()
})

/* ─── App Lifecycle ─────────────────────────────────────────────── */

app.whenReady().then(createMainWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
})
