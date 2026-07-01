// src-tauri/src/headless.rs
//
// Layer 4 — Headless Chrome Chat Collector
// ─────────────────────────────────────────────────────────────────
// Launches headless Chrome, connects via CDP (Chrome DevTools
// Protocol), navigates to YouTube live chat, and captures new
// messages using a DOM MutationObserver.
//
// We use raw CDP over WebSocket instead of chromimuoxide because:
//   - chromimuoxide 0.5.x can't deserialize messages from modern
//     Chrome versions (deserialization errors).
//   - CDP is a simple JSON-over-WebSocket protocol — we only need
//     3 commands: Page.addScriptToEvaluateOnNewDocument,
//     Page.navigate, Runtime.evaluate.

use futures_util::SinkExt;
use futures_util::StreamExt;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};

/// Concrete WebSocket stream type used throughout this module.
type WsStream = WebSocketStream<MaybeTlsStream<TcpStream>>;

use crate::processor::{RawMessage, RawMessageKind};

// ─── Public types ─────────────────────────────────────────────────

/// Handle to a running headless Chrome session.
pub struct HeadlessHandle {
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
    join_handle: Option<tokio::task::JoinHandle<()>>,
}

impl HeadlessHandle {
    pub async fn shutdown(mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
        if let Some(jh) = self.join_handle.take() {
            let _ = jh.await;
        }
    }
}

impl Drop for HeadlessHandle {
    fn drop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

// ─── Public API ───────────────────────────────────────────────────

pub async fn start_headless(
    video_id: &str,
    msg_tx: mpsc::Sender<RawMessage>,
) -> Result<HeadlessHandle, String> {
    let url = format!("https://www.youtube.com/live_chat?v={video_id}&is_popout=1");

    // ── 1. Find Chrome ────────────────────────────────────────
    let chrome_path = find_chrome().ok_or_else(|| {
        "[headless] Chrome not found — install Chrome or Chromium".to_string()
    })?;
    log::info!("[headless] Using Chrome: {chrome_path}");

    // ── 2. Launch Chrome with remote debugging ────────────────
    let debug_port = launch_chrome(&chrome_path).await?;
    log::info!("[headless] Chrome launched, debug port: {debug_port}");

    // ── 3. Connect to CDP WebSocket ───────────────────────────
    let ws_url = get_websocket_debug_url(debug_port).await?;
    log::info!("[headless] Connecting to CDP: {ws_url}");
    let (mut ws, _) = connect_async(&ws_url)
        .await
        .map_err(|e| format!("[headless] CDP WS connect failed: {e}"))?;

    // ── 4. Enable Page domain + inject MutationObserver ───────
    cdp_send(&mut ws, "Page.enable", serde_json::json!({})).await?;

    // Combined script: anti-detection + MutationObserver.
    // The navigator.webdriver override is a backup for
    // --disable-blink-features=AutomationControlled (not all Chrome
    // versions support that flag).
    let observer_script = r#"
(function() {
  if (window.__livicat_observer) return;

  // ── Bypass headless detection ──────────────────────────
  Object.defineProperty(navigator, 'webdriver', { get: function() { return false; } });

  window.__livicat_buffer = [];
  window.__livicat_observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mut) {
      if (!mut.addedNodes) return;
      for (var i = 0; i < mut.addedNodes.length; i++) {
        var node = mut.addedNodes[i];
        if (node.nodeType !== 1) continue;
        if (node.tagName === 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER') {
          var authorEl = node.querySelector('#author-name');
          var msgEl = node.querySelector('#message');
          var photoEl = node.querySelector('#author-photo img');
          var badgesEl = node.querySelector('#chat-badges');
          var role = node.getAttribute('data-role') || '';
          window.__livicat_buffer.push({
            author: authorEl ? authorEl.textContent.trim() : '',
            text: msgEl ? msgEl.textContent.trim() : '',
            photo: photoEl ? (photoEl.src || '') : '',
            badges: badgesEl ? Array.from(badgesEl.querySelectorAll('img.badge')).map(function(i) { return i.src; }) : [],
            role: role
          });
        }
      }
    });
  });
  window.__livicat_observer.observe(document.documentElement, { childList: true, subtree: true });
})();
"#;

    cdp_send(
        &mut ws,
        "Page.addScriptToEvaluateOnNewDocument",
        serde_json::json!({ "source": observer_script }),
    )
    .await?;
    log::info!("[headless] MutationObserver injected");

    // ── 5. Navigate to YouTube live chat ──────────────────────
    log::info!("[headless] Navigating to {url}");
    cdp_send(&mut ws, "Page.navigate", serde_json::json!({ "url": url })).await?;
    log::info!("[headless] Page.navigate returned — page is loading");

    // ── 6. Wait for chat renderer ─────────────────────────────
    wait_for_chat(&mut ws).await?;

    // ── 7. Scrape initial messages ────────────────────────────
    let initial_payload = cdp_eval_string(
        &mut ws,
        r#"
(function() {
  var items = [];
  document.querySelectorAll('yt-live-chat-text-message-renderer').forEach(function(el) {
    var authorEl = el.querySelector('#author-name');
    var msgEl = el.querySelector('#message');
    var photoEl = el.querySelector('#author-photo img');
    var badgesEl = el.querySelector('#chat-badges');
    var role = el.getAttribute('data-role') || '';
    items.push({
      author: authorEl ? authorEl.textContent.trim() : '',
      text: msgEl ? msgEl.textContent.trim() : '',
      photo: photoEl ? (photoEl.src || '') : '',
      badges: badgesEl ? Array.from(badgesEl.querySelectorAll('img.badge')).map(function(i) { return i.src; }) : [],
      role: role
    });
  });
  return JSON.stringify(items);
})();
"#,
    )
    .await?;

    let initial_msg = RawMessage {
        kind: RawMessageKind::InitialDump,
        payload: initial_payload,
    };
    if msg_tx.send(initial_msg).await.is_err() {
        log::error!("[headless] Channel closed during initial scrape");
    }

    // ── 8. Poll loop ──────────────────────────────────────────
    let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    // Move ws into the poll loop — we keep a single connection alive
    let join_handle = tokio::spawn(async move {
        let mut ws = ws; // take ownership
        let mut interval = tokio::time::interval(Duration::from_millis(500));
        let mut missed_pings = 0u32;

        loop {
            tokio::select! {
                _ = &mut shutdown_rx => {
                    log::info!("[headless] Shutdown signal received");
                    break;
                }
                _ = interval.tick() => {
                    match drain_buffer(&mut ws).await {
                        Ok(raws) => {
                            missed_pings = 0;
                            for raw in raws {
                                if msg_tx.send(raw).await.is_err() {
                                    log::error!("[headless] Channel closed, stopping");
                                    return;
                                }
                            }
                        }
                        Err(e) => {
                            missed_pings += 1;
                            if missed_pings >= 20 {
                                log::error!("[headless] Page dead after {missed_pings} failed polls: {e}");
                                return;
                            }
                        }
                    }
                }
            }
        }

        // Kill Chrome process
        if let Ok(mut guard) = CHROME_CHILD.lock() {
            if let Some(ref mut child) = *guard {
                let _ = child.kill();
                let _ = child.wait();
            }
            *guard = None;
        }
        log::info!("[headless] Poll loop exited, Chrome killed");
    });

    Ok(HeadlessHandle {
        shutdown_tx: Some(shutdown_tx),
        join_handle: Some(join_handle),
    })
}

// ─── Chrome launch ───────────────────────────────────────────────

/// Chrome process handle — killing it on drop is handled by the OS
/// when the process stdin/stdout/stderr handles are closed.
static NEXT_CMD_ID: AtomicU64 = AtomicU64::new(1);
static CHROME_CHILD: Mutex<Option<std::process::Child>> = Mutex::new(None);

/// Launch Chrome headless and return its remote debugging port.
async fn launch_chrome(chrome_path: &str) -> Result<u16, String> {
    let port = pick_ephemeral_port().await?;

    // Use a modern Chrome User-Agent so YouTube doesn't detect headless mode.
    // The --user-agent flag sets both the HTTP header AND navigator.userAgent.
    let user_agent = if cfg!(target_os = "windows") {
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    } else if cfg!(target_os = "macos") {
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    } else {
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    };

    let child = std::process::Command::new(chrome_path)
        .arg(format!("--remote-debugging-port={}", port))
        .arg("--headless=new")
        // ── Anti-detection flags ──────────────────────────────
        .arg(format!("--user-agent={}", user_agent))
        .arg("--disable-blink-features=AutomationControlled")
        // ── Stealth flags ─────────────────────────────────────
        .arg("--no-first-run")
        .arg("--no-default-browser-check")
        .arg("--disable-extensions")
        .arg("--disable-background-networking")
        .arg("--disable-sync")
        .arg("--disable-translate")
        .arg("--hide-scrollbars")
        .arg("--mute-audio")
        .arg("--disable-gpu")
        .arg("--window-size=1920,1080")
        .arg("about:blank")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("[headless] Failed to spawn Chrome: {e}"))?;

    // Store the child handle so we can kill it later
    if let Ok(mut guard) = CHROME_CHILD.lock() {
        *guard = Some(child);
    }

    // Wait for Chrome to start listening
    let start = std::time::Instant::now();
    loop {
        if start.elapsed() > std::time::Duration::from_secs(15) {
            return Err("[headless] Chrome startup timeout (15s)".to_string());
        }
        if let Ok(response) = reqwest::get(&format!("http://127.0.0.1:{port}/json/version")).await {
            if response.status().is_success() {
                return Ok(port);
            }
        }
        sleep(Duration::from_millis(200)).await;
    }
}

/// Find a free ephemeral port for Chrome's debugging endpoint.
async fn pick_ephemeral_port() -> Result<u16, String> {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("[headless] Port bind failed: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| e.to_string())?
        .port();
    drop(listener); // release the port immediately
    // Brief pause so Chrome can grab it before something else does
    sleep(Duration::from_millis(50)).await;
    Ok(port)
}

// ─── CDP connection ──────────────────────────────────────────────

/// Get the WebSocket debug URL for the first available page target.
async fn get_websocket_debug_url(port: u16) -> Result<String, String> {
    let url = format!("http://127.0.0.1:{port}/json");
    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("[headless] Failed to get targets: {e}"))?;
    let targets: Vec<serde_json::Value> = resp
        .json()
        .await
        .map_err(|e| format!("[headless] Failed to parse targets: {e}"))?;

    // Find a page target (prefer one with "page" type, or create a new page)
    let target = targets
        .iter()
        .find(|t| t["type"] == "page")
        .or_else(|| targets.first())
        .ok_or_else(|| "[headless] No debuggable targets found".to_string())?;

    target["webSocketDebuggerUrl"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "[headless] Target has no webSocketDebuggerUrl".to_string())
}

// ─── CDP helpers ─────────────────────────────────────────────────

/// Send a CDP command and wait for the response matching our `id`.
///
/// Uses a 15-second timeout internally so the caller never hangs
/// indefinitely if Chrome stops responding.
async fn cdp_send(
    ws: &mut WsStream,
    method: &str,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let id = NEXT_CMD_ID.fetch_add(1, Ordering::Relaxed);
    let cmd = serde_json::json!({
        "id": id,
        "method": method,
        "params": params,
    });

    ws.send(Message::Text(cmd.to_string()))
        .await
        .map_err(|e| format!("[headless] WS send failed: {e}"))?;

    // Read messages until we get a response with our id, or timeout
    let timeout_dur = Duration::from_secs(15);
    let deadline = tokio::time::Instant::now() + timeout_dur;

    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            return Err(format!(
                "[headless] CDP timeout ({timeout_dur:?}) waiting for {method}#{id}"
            ));
        }

        let msg = tokio::time::timeout(remaining, ws.next()).await;
        let msg = match msg {
            Ok(Some(v)) => v,
            Ok(None) => return Err("[headless] WS stream ended".to_string()),
            Err(_) => {
                return Err(format!(
                    "[headless] CDP timeout ({timeout_dur:?}) for {method}#{id}"
                ))
            }
        };

        let text = match msg {
            Ok(Message::Text(t)) => t,
            Ok(Message::Ping(_)) | Ok(Message::Pong(_)) => continue,
            Ok(Message::Close(_)) => return Err("[headless] WS closed".to_string()),
            Ok(_) => continue,
            Err(e) => return Err(format!("[headless] WS error: {e}")),
        };

        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
            // Check if this is a response to our command
            if val.get("id").and_then(|v| v.as_u64()) == Some(id) {
                if let Some(err) = val.get("error") {
                    return Err(format!("[headless] CDP error for {method}: {err}"));
                }
                return Ok(val["result"].clone());
            }
            // Otherwise it's an event — ignore
        }
    }
}

/// Evaluate JS that returns a JSON-stringified string.
async fn cdp_eval_string(
    ws: &mut WsStream,
    js: &str,
) -> Result<String, String> {
    let result = cdp_send(
        ws,
        "Runtime.evaluate",
        serde_json::json!({
            "expression": js,
            "returnByValue": true,
            "awaitPromise": true,
        }),
    )
    .await?;

    // Navigate to the result value
    let value = result
        .pointer("/result/value")
        .or_else(|| result.pointer("/value"))
        .ok_or_else(|| {
            format!(
                "[headless] Runtime.evaluate returned no value: {}",
                serde_json::to_string(&result).unwrap_or_default()
            )
        })?;

    value
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| {
            format!(
                "[headless] JS result is not a string: {}",
                serde_json::to_string(value).unwrap_or_default()
            )
        })
}

// ─── JS helpers ──────────────────────────────────────────────────

/// Wait up to 30 seconds for the chat renderer to appear.
/// Uses synchronous JS (no await) so it works even while the page is
/// still loading. Errors are retried silently.
async fn wait_for_chat(
    ws: &mut WsStream,
) -> Result<(), String> {
    let js = r#"
(function() {
  var el = document.querySelector('yt-live-chat-text-message-renderer');
  return JSON.stringify({ found: el !== null && el !== undefined });
})();
"#;

    for i in 0..60 {
        match cdp_eval_string(ws, js).await {
            Ok(payload) => {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&payload) {
                    if val["found"].as_bool() == Some(true) {
                        log::info!("[headless] Chat detected after {}s", i / 2);
                        return Ok(());
                    }
                }
                log::info!("[headless] Chat check #{i}/60 — page loaded but chat renderer not yet in DOM");
            }
            Err(e) => {
                // Info-level so we can diagnose hangs in production
                log::info!("[headless] Chat check #{i}/60 failed (page still loading?): {e}");
            }
        }
        sleep(Duration::from_millis(500)).await;
    }
    Err("[headless] Timed out waiting for chat renderer (30s)".to_string())
}

/// Drain buffered messages from the MutationObserver buffer.
async fn drain_buffer(
    ws: &mut WsStream,
) -> Result<Vec<RawMessage>, String> {
    let json_str = cdp_eval_string(
        ws,
        r#"
(function() {
  var buf = window.__livicat_buffer || [];
  if (buf.length === 0) return '[]';
  var copy = buf.slice();
  buf.length = 0;
  return JSON.stringify(copy);
})();
"#,
    )
    .await?;

    if json_str == "[]" {
        return Ok(vec![]);
    }

    let entries: Vec<serde_json::Value> = serde_json::from_str(&json_str).unwrap_or_default();
    let mut raws = Vec::with_capacity(entries.len());

    for entry in entries {
        let item_str = serde_json::to_string(&entry).unwrap_or_default();
        raws.push(RawMessage {
            kind: RawMessageKind::DomMessage,
            payload: item_str,
        });
    }

    Ok(raws)
}

// ─── Chrome discovery ────────────────────────────────────────────

#[cfg(target_os = "macos")]
fn find_chrome() -> Option<String> {
    let candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ];
    for path in &candidates {
        if std::path::Path::new(path).exists() {
            return Some(path.to_string());
        }
    }
    which("google-chrome")
        .or_else(|| which("chromium"))
        .or_else(|| which("google-chrome-stable"))
}

#[cfg(target_os = "windows")]
fn find_chrome() -> Option<String> {
    let candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files\Chromium\Application\chrome.exe",
    ];
    for path in &candidates {
        if std::path::Path::new(path).exists() {
            return Some(path.to_string());
        }
    }
    if let Ok(username) = std::env::var("USERNAME") {
        let local = format!(
            r"C:\Users\{}\AppData\Local\Google\Chrome\Application\chrome.exe",
            username
        );
        if std::path::Path::new(&local).exists() {
            return Some(local);
        }
    }
    which("chrome").or_else(|| which("chromium"))
}

#[cfg(target_os = "linux")]
fn find_chrome() -> Option<String> {
    which("google-chrome")
        .or_else(|| which("chromium"))
        .or_else(|| which("chromium-browser"))
        .or_else(|| which("google-chrome-stable"))
}

fn which(name: &str) -> Option<String> {
    std::env::var_os("PATH").and_then(|paths| {
        for dir in std::env::split_paths(&paths) {
            let full = dir.join(name);
            if full.exists() {
                return Some(full.to_string_lossy().into_owned());
            }
            #[cfg(target_os = "windows")]
            {
                let with_exe = dir.join(format!("{name}.exe"));
                if with_exe.exists() {
                    return Some(with_exe.to_string_lossy().into_owned());
                }
            }
        }
        None
    })
}
