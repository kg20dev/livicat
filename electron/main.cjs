const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

/* ─── Constants ──────────────────────────────────────────────────── */

const isDev = !app.isPackaged
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
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
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
      contextIsolation: true,
      nodeIntegration: false,
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
  console.log('[Livicat] CSS preview:', css.substring(0, 200))

  // Append a debug rule to prove injection works (bright red border on body)
  const debugCSS =
    '\n/* livicat-debug */ body { outline: 3px solid red !important; outline-offset: -3px !important; }'
  const fullCSS = css + debugCSS

  const script = `
    (function() {
      try {
        var existing = document.getElementById('livicat-css');
        if (existing) existing.remove();
        if (!${JSON.stringify(fullCSS)}) return;
        var style = document.createElement('style');
        style.id = 'livicat-css';
        style.textContent = ${JSON.stringify(fullCSS)};
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

  // Dump DOM structure for debugging selectors
  dumpPreviewDOM()
}

/** Log the key DOM structure of YouTube's chat page for selector debugging */
function dumpPreviewDOM() {
  if (!previewWindow || previewWindow.isDestroyed()) return

  const dumpScript = `
    (function() {
      var lines = ['--- YouTube Chat DOM Structure ---'];
      // Top-level chat elements
      var chatApp = document.querySelector('yt-live-chat-app');
      lines.push('yt-live-chat-app: ' + (chatApp ? 'found' : 'NOT FOUND'));

      var header = document.querySelector('yt-live-chat-header-renderer');
      lines.push('yt-live-chat-header-renderer: ' + (header ? 'found' : 'NOT FOUND'));

      var items = document.querySelector('#items');
      lines.push('#items: ' + (items ? 'found' : 'NOT FOUND'));

      var messages = document.querySelectorAll('yt-live-chat-text-message-renderer');
      lines.push('yt-live-chat-text-message-renderer count: ' + messages.length);

      if (messages.length > 0) {
        var first = messages[0];
        lines.push('--- First message inner elements ---');
        var childEls = first.querySelectorAll('*');
        var seen = new Set();
        childEls.forEach(function(el) {
          var tag = el.tagName.toLowerCase();
          var id = el.id ? '#' + el.id : '';
          var cls = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.') : '';
          var key = tag + id;
          if (!seen.has(key)) {
            seen.add(key);
            lines.push('  ' + tag + id + cls);
          }
        });
      }

      // Check for icon buttons (scroll-to-bottom)
      var iconButtons = document.querySelectorAll('yt-icon-button');
      lines.push('yt-icon-button count: ' + iconButtons.length);

      var scrollButtons = document.querySelectorAll('#chat-scroll-button, yt-live-chat-renderer yt-icon-button');
      lines.push('scroll buttons: ' + scrollButtons.length);

      // Check scrollable area
      var scrollers = document.querySelectorAll('#item-scroller, #chat-messages, yt-live-chat-item-list-renderer');
      lines.push('scrollers (#item-scroller, #chat-messages, yt-live-chat-item-list-renderer): ' + scrollers.length);

      // Dump first 40 chars of each for reference
      var chatContainer = document.querySelector('#chat, yt-live-chat-renderer, #contents');
      lines.push('chat container (#chat, yt-live-chat-renderer, #contents): ' + (chatContainer ? chatContainer.tagName + (chatContainer.id ? '#' + chatContainer.id : '') : 'NOT FOUND'));

      console.log(lines.join('\\\\n'));
      return lines.join('\\\\n');
    })();
  `
  previewWindow.webContents
    .executeJavaScript(dumpScript)
    .then((result) => {
      console.log('[Livicat] DOM dump:')
      const lines = result.split('\\n')
      lines.forEach((l) => console.log('  ' + l))
    })
    .catch((err) => {
      console.error('[Livicat] DOM dump failed:', err.message)
    })
}

function closePreviewWindow() {
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.close()
  }
  previewWindow = null
  currentVideoId = null
}

/* ─── IPC Handlers ──────────────────────────────────────────────── */

ipcMain.on('open-chat-preview', (_event, { videoId, css }) => {
  if (videoId) openPreviewWindow(videoId, css)
})

ipcMain.on('update-chat-css', (_event, { css }) => {
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
