// src-tauri/src/webview_chat.rs
//
// Layer 4 — Tauri WebView Chat Collector
// ─────────────────────────────────────────────────────────────────
// Replaces headless Chrome with Tauri's built-in WebView.
//
// How it works:
//   1. A hidden off-screen WebView navigates to YouTube live chat.
//   2. CSS is injected (same mechanism as the preview window).
//   3. A MutationObserver script scrapes messages and writes them
//      to `location.hash` as a side-channel.
//   4. A Rust poll loop reads the hash via `window.url()?.fragment()`,
//      parses the messages, and pushes them to the MessageStore.
//   5. The MessageStore broadcasts to the renderer's SSE clients.
//
// Why a URL hash side-channel instead of fetch/__TAURI__:
//   - __TAURI__.event.emit is NOT available on external URLs in
//     Tauri v2 (security restriction).
//   - fetch/XHR/WebSocket are blocked by YouTube's Content Security
//     Policy (CSP) strict connect-src.
//   - Even `<img>` tags might be blocked by CSP img-src.
//   - location.hash is a zero-CSP, zero-IPC, zero-network side-
//     channel that works in ALL page contexts.

use std::sync::{Arc, Mutex};
use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder};
use tokio::sync::oneshot;
use tokio::time::Duration;

use base64::Engine as _;

use crate::processor::MessageStore;
use crate::PREVIEW_USER_AGENT;

// ─── Public API ───────────────────────────────────────────────────

/// Create a hidden off-screen Tauri WebView, navigate to YouTube live
/// chat, inject the chat observer + CSS, and start a Rust poll loop
/// that reads captured messages from `location.hash`.
pub async fn start_webview_chat(
    app: &AppHandle,
    video_id: &str,
    css: &str,
    hide_atsign: bool,
    store: MessageStore,
) -> Result<(), String> {
    let url = format!("https://www.youtube.com/live_chat?v={video_id}&is_popout=1");
    let label = "livicat-chat";

    log::info!("[webview-chat] Creating hidden WebView for {url}");

    // ── 1. Create an off-screen WebView window ──────────────────
    // IMPORTANT: Do NOT use .hide() or .visible(false) here.
    // On macOS with WKWebView, hiding the window causes the web
    // content process to be terminated ("web content process
    // terminated"), which kills all JS execution silently.
    // Instead, position the window far off-screen so it stays
    // alive in the system but is never visible to the user.
    let (page_loaded_tx, page_loaded_rx) = oneshot::channel::<()>();

    // Arc<Mutex<>> allows taking the oneshot sender in an Fn+Send+Sync closure
    // (the on_page_load callback requires Sync because it may be called from
    // any thread; RefCell is !Sync and won't compile).
    let page_loaded_tx = Arc::new(Mutex::new(Some(page_loaded_tx)));
    let tx_for_callback = page_loaded_tx.clone();

    let window = WebviewWindowBuilder::new(
        app,
        label,
        WebviewUrl::External(url.parse().map_err(|e| format!("Invalid URL: {e}"))?),
    )
    .title("Livicat Chat")
    .inner_size(420.0, 700.0)
    .position(-16000.0, -16000.0) // Off-screen — user never sees it
    .skip_taskbar(true) // Keep it out of the dock/taskbar
    .user_agent(PREVIEW_USER_AGENT)
    .on_page_load(move |_window, payload| {
        use tauri::webview::PageLoadEvent;
        if payload.event() == PageLoadEvent::Finished {
            if let Some(tx) = tx_for_callback.lock().unwrap().take() {
                let _ = tx.send(());
            }
        }
    })
    .build()
    .map_err(|e| format!("[webview-chat] Failed to create WebView: {e}"))?;

    // Keep window off-screen — do NOT call .hide() (see above)

    // ── 2. Wait for YouTube to load (up to 30s) ──────────────
    tokio::time::timeout(Duration::from_secs(30), page_loaded_rx)
        .await
        .map_err(|_| "[webview-chat] Timeout waiting for page load".to_string())?
        .map_err(|_| "[webview-chat] Page load signal dropped".to_string())?;

    log::info!("[webview-chat] Page loaded, injecting CSS + observer");

    // ── 3. Inject CSS (same mechanism as preview) ────────────
    inject_css_to_window(&window, css)?;

    // ── 4. Inject the observer script ──────────────────────────
    // The observer writes captured messages to `location.hash`
    // using a side-channel (no CSP/__TAURI__ needed).
    // @ stripping is done via CSS in the theme layer (text-indent).
    let observer_script = build_observer_script(hide_atsign);
    window
        .eval(&observer_script)
        .map_err(|e| format!("[webview-chat] Failed to inject observer: {e}"))?;

    log::info!("[webview-chat] Observer injected, chat capture active");

    // ── 5. Poll the WebView URL hash for captured data ────────
    // Reads `location.hash` every 500ms, decodes messages from the
    // `__livicat=` prefix, and pushes them to the MessageStore.
    // The hash is cleared after reading to prevent double-processing.
    let window_clone = window.clone();
    let store_clone = store.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_millis(500));
        loop {
            interval.tick().await;

            // Read the current URL fragment
            let hash = match window_clone.url() {
                Ok(u) => u.fragment().unwrap_or("").to_string(),
                Err(_) => continue,
            };

            // Check if our data marker is present
            if !hash.starts_with("__livicat=") {
                continue;
            }

            // Decode Base64 → UTF-8 string → JSON
            let encoded = &hash["__livicat=".len()..];
            let decoded_bytes = match base64::engine::general_purpose::STANDARD.decode(encoded) {
                Ok(b) => b,
                Err(_) => continue,
            };
            let decoded = match String::from_utf8(decoded_bytes) {
                Ok(s) => s,
                Err(_) => continue,
            };

            // Parse and push each message to the store
            if let Ok(entries) = serde_json::from_str::<Vec<serde_json::Value>>(&decoded) {
                let count = entries.len();
                for entry in &entries {
                    let json = serde_json::to_string(entry).unwrap_or_default();
                    if let Some(msg) = crate::processor::parse_dom_message(&json) {
                        store_clone.push(msg);
                    }
                }
                if count > 0 {
                    log::debug!("[webview-chat] Hash relay: {count} messages");
                }
            }

            // Clear the hash so the observer can write the next batch
            let _ = window_clone.eval("history.replaceState(null, '', location.pathname);");
        }
    });

    Ok(())
}

// ─── CSS injection + utilities ─────────────────────────────────────

/// Injects theme CSS + auto-scroll + show-more auto-click into the
/// hidden WebView's YouTube page.
///
/// Auto-scroll keeps the chat scrolled to the bottom, otherwise
/// YouTube pauses loading new messages. Show-more auto-click
/// clicks "show more" buttons so we capture the full message text.
fn inject_css_to_window(window: &tauri::WebviewWindow, css: &str) -> Result<(), String> {
    let css_json =
        serde_json::to_string(css).map_err(|e| format!("CSS JSON serialize error: {e}"))?;

    let script = format!(
        r#"(function() {{
  try {{
    var existing = document.getElementById('livicat-css');
    if (existing) existing.remove();
    var style = document.createElement('style');
    style.id = 'livicat-css';
    style.textContent = {};
    document.head.appendChild(style);
  }} catch(e) {{
    console.error('[Livicat] CSS injection error:', e);
  }}

  /* ── Auto-scroll to bottom ──────────────────────────── */
  /* YouTube pauses loading new messages when scrolled up. */
  (function() {{
    var el = document.querySelector('#item-scroller') ||
             document.querySelector('yt-live-chat-item-list-renderer #item-scroller');
    if (!el) return;
    var scroll = function() {{ el.scrollTop = el.scrollHeight; }};
    scroll();
    [300, 1000, 2500, 5000].forEach(function(t) {{ setTimeout(scroll, t); }});
  }})();

  /* ── Show-more auto-click ──────────────────────────── */
  /* YouTube truncates long messages behind a "show more"
     button. Our observer would only capture the truncated
     text without clicking it. */
  (function() {{
    var clickShowMore = function() {{
      var btn = document.querySelector('yt-icon-button#show-more button#button');
      if (btn) btn.click();
    }};
    clickShowMore();
    if (!window.__livicat_show_more_obs) {{
      window.__livicat_show_more_obs = new MutationObserver(clickShowMore);
      window.__livicat_show_more_obs.observe(document.documentElement, {{ childList: true, subtree: true }});
    }}
  }})();

  console.log('[Livicat] CSS + auto-scroll + show-more injected');
}})();"#,
        css_json,
    );

    window
        .eval(&script)
        .map_err(|e| format!("[webview-chat] CSS eval failed: {e}"))
}

// ─── Observer script builder ──────────────────────────────────────

/// Build the JavaScript that observes YouTube chat and writes captured
/// messages to `location.hash` as a side-channel.
///
/// A Rust poll loop reads the hash every 500ms, decodes the messages,
/// and pushes them to the MessageStore. This avoids:
///   - `__TAURI__` IPC (unavailable on external URLs in Tauri v2)
///   - CSP `connect-src` (blocks fetch/XHR/WebSocket)
///   - CSP `img-src` (might block `<img>` tag workarounds)
fn build_observer_script(hide_atsign: bool) -> String {
    let strip_at_bool = if hide_atsign { "true" } else { "false" };

    format!(
        r#"(function() {{
  if (window.__livicat_active) return;

  var STRIP_AT = {};

  /* ── Send data via location.hash (CSP-proof side-channel) ─ */
  function sendToRust(data) {{
    if (!data || data.length === 0) return;
    /* Only write if the previous batch was consumed by Rust */
    if (!location.hash.startsWith('#__livicat=')) {{
      var json = JSON.stringify(data);
      var b64 = btoa(unescape(encodeURIComponent(json)));
      location.hash = '__livicat=' + b64;
    }}
  }}

  /* ── Extract message from a DOM element ──────────────── */
  function scrapeMessage(el) {{
    var authorEl = el.querySelector('#author-name');
    var msgEl = el.querySelector('#message');
    var photoEl = el.querySelector('#author-photo img');
    var badgesEl = el.querySelector('#chat-badges');
    var role = el.getAttribute('data-role') || '';
    var author = authorEl ? authorEl.textContent.trim() : '';
    if (STRIP_AT && author.charAt(0) === '@') {{
      author = author.substring(1);
    }}
    return {{
      author: author,
      text: msgEl ? msgEl.innerHTML.trim() : '',
      photo: photoEl ? (photoEl.src || '') : '',
      badges: badgesEl ? Array.from(badgesEl.querySelectorAll('img.badge')).map(function(i) {{ return i.src; }}) : [],
      role: role
    }};
  }}

  /* ── Wait for chat to be ready, then activate ─────────── */
  function init() {{
    if (!document.querySelector('yt-live-chat-text-message-renderer')) {{
      setTimeout(init, 500);
      return;
    }}

    window.__livicat_active = true;
    console.log('[Livicat] Chat detected, observer active');

    /* Scrape existing messages */
    var existing = [];
    document.querySelectorAll('yt-live-chat-text-message-renderer').forEach(function(el) {{
      existing.push(scrapeMessage(el));
    }});
    sendToRust(existing);

    /* MutationObserver for new messages */
    window.__livicat_buffer = [];
    window.__livicat_observer = new MutationObserver(function(mutations) {{
      mutations.forEach(function(mut) {{
        if (!mut.addedNodes) return;
        for (var i = 0; i < mut.addedNodes.length; i++) {{
          var node = mut.addedNodes[i];
          if (node.nodeType !== 1) continue;
          if (node.tagName === 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER') {{
            window.__livicat_buffer.push(scrapeMessage(node));
          }}
        }}
      }});
    }});
    window.__livicat_observer.observe(document.documentElement, {{ childList: true, subtree: true }});

    /* Drain buffer every 500ms */
    setInterval(function() {{
      var buf = window.__livicat_buffer;
      if (!buf || buf.length === 0) return;
      var copy = buf.splice(0);
      sendToRust(copy);
    }}, 500);
  }}

  init();
}})();"#,
        strip_at_bool,
    )
}
