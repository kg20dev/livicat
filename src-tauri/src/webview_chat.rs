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

    log::info!("[webview-chat] Scraper injected, Rust-driven capture active");

    // ── 5. Rust-driven poll loop (throttle-proof) ──────────────
    // The webview's JS timers get suspended by macOS when the off-screen
    // window is occluded (buried/minimized) — so we can't rely on a
    // MutationObserver or setInterval inside the webview. Instead, this
    // NATIVE tokio timer (which is never throttled by window occlusion)
    // drives capture: each tick we (a) eval __livicatScrape() into the
    // webview, which scans the DOM and writes new messages to
    // location.hash, then (b) read the hash back and push to the store.
    //
    // window.eval() dispatched from native executes on the JS thread as
    // a direct dispatch rather than via the throttled timer queue, so
    // the scrape runs even while the webview would otherwise be paused.
    let window_clone = window.clone();
    let store_clone = store.clone();
    tokio::spawn(async move {
        // 150ms cadence — frequent enough to feel live, cheap enough to
        // be negligible. The webview only re-scans on our cue.
        let mut interval = tokio::time::interval(Duration::from_millis(150));
        loop {
            interval.tick().await;

            // (a) Tell the webview to scrape now. This writes any new
            // messages to location.hash (or queues them if the hash is
            // still busy from a previous tick). Ignore eval errors —
            // the window may be closing; we just skip this tick.
            if window_clone.eval("window.__livicatScrape && window.__livicatScrape();").is_err() {
                continue;
            }

            // (b) Read back whatever the scrape wrote.
            let hash = match window_clone.url() {
                Ok(u) => u.fragment().unwrap_or("").to_string(),
                Err(_) => continue,
            };
            if !hash.starts_with("__livicat=") {
                continue;
            }

            // Decode Base64 → UTF-8 → JSON
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
                    log::debug!("[webview-chat] Scraped {count} message(s)");
                }
            }

            // Clear the hash so the next scrape can write a fresh batch
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
  if (window.__livicat_installed) return; // idempotent — safe to re-inject
  window.__livicat_installed = true;

  var STRIP_AT = {};

  /* ══ RUST-DRIVEN SCRAPING (throttle-proof) ════════════════════
     The OLD design ran a MutationObserver + setInterval INSIDE this
     webview to push messages. But when the off-screen window is
     occluded/buried, macOS suspends the WKWebView's JS thread — so
     those timers STOPPED firing and messages stopped reaching OBS
     ("sometimes works sometimes not").

     The fix: no self-running JS timers. Instead we expose a global
     __livicatScrape() function and let RUST call it on a native
     tokio timer (which is never throttled by window occlusion).
     Each Rust-driven call scans the DOM for messages we haven't sent
     yet (dedup'd via a fingerprint Set) and writes them to
     location.hash, which Rust reads back. Initial + incremental
     messages are handled by the SAME scan — the first call captures
     everything already in the DOM; later calls capture only new ones.

     Why this beats the observer: window.eval() injected from native
     executes on the JS thread as a direct dispatch (not via the
     throttled timer queue), so it runs even when the webview would
     otherwise be suspended. Native Rust timers are the heartbeat.
  */

  var STRIP_AT_LOCAL = STRIP_AT;
  window.__livicat_seen = {{}}; // fingerprint set: author + separator + text

  function isDuplicate(msg) {{
    var key = msg.author + '\u0001' + msg.text;
    if (window.__livicat_seen[key]) return true;
    window.__livicat_seen[key] = true;
    return false;
  }}

  /* ── Role detection (multi-strategy, robust) ───────────── */
  function detectRoleFromBadges(root) {{
    if (!root) return '';
    var badgeEls = root.querySelectorAll(
      'yt-live-chat-author-badge-renderer, yt-live-chat-author-chip yt-live-chat-author-badge-renderer'
    );
    for (var i = 0; i < badgeEls.length; i++) {{
      var b = badgeEls[i];
      var icon = b.querySelector('yt-icon');
      var label = (b.getAttribute('aria-label') || '') + ' ' +
                  (icon ? (icon.getAttribute('aria-label') || '') : '') + ' ' +
                  (icon ? (icon.getAttribute('icon') || icon.getAttribute('name') || '') : '');
      label = label.toLowerCase();
      if (label.indexOf('owner') >= 0 || label.indexOf('broadcaster') >= 0) return 'owner';
      if (label.indexOf('moderator') >= 0 || label.indexOf('mod') >= 0) return 'moderator';
      if (label.indexOf('member') >= 0 || label.indexOf('sponsor') >= 0) return 'member';
      if (label.indexOf('verified') >= 0) return 'verified';
    }}
    return '';
  }}

  function scrapeMessage(el) {{
    var authorEl = el.querySelector('#author-name');
    var msgEl = el.querySelector('#message');
    var photoEl = el.querySelector('#author-photo img');
    var badgesEl = el.querySelector('#chat-badges');
    var role =
      el.getAttribute('author-type') ||
      detectRoleFromBadges(el) ||
      el.getAttribute('data-role') ||
      '';
    var author = authorEl ? authorEl.textContent.trim() : '';
    if (STRIP_AT_LOCAL && author.charAt(0) === '@') {{
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

  /* ── The function Rust calls each tick ───────────────────
     Scans the whole chat, collects NEW (unseen) messages, and writes
     them to location.hash for Rust to read. If the hash is still
     occupied by a previous unread batch, it does NOT block — it
     queues to window.__livicat_pending and a subsequent call (or the
     pending-flush below) drains it. Returns the number written.

     This handles BOTH initial load (first call sees all existing
     messages) and incremental updates (later calls see only new ones)
     via the same dedup'd full scan. */
  window.__livicat_pending = [];

  function flushPending() {{
    if (window.__livicat_pending.length === 0) return 0;
    if (location.hash.indexOf('#__livicat=') === 0) return 0; // still busy
    var batch = window.__livicat_pending.shift();
    if (!batch || batch.length === 0) return 0;
    var json = JSON.stringify(batch);
    var b64 = btoa(unescape(encodeURIComponent(json)));
    location.hash = '__livicat=' + b64;
    return batch.length;
  }}

  /* Rust invokes this directly via window.eval on a native timer. */
  window.__livicatScrape = function() {{
    // First, drain anything queued from a previous busy-hash tick.
    var flushed = flushPending();

    // Full DOM scan for new messages.
    var fresh = [];
    var nodes = document.querySelectorAll('yt-live-chat-text-message-renderer');
    for (var i = 0; i < nodes.length; i++) {{
      var m = scrapeMessage(nodes[i]);
      if (!isDuplicate(m)) fresh.push(m);
    }}

    if (fresh.length === 0) return flushed;

    // Try to write immediately; if the hash is busy, queue for next tick.
    if (location.hash.indexOf('#__livicat=') === 0) {{
      window.__livicat_pending.push(fresh);
    }} else {{
      var json = JSON.stringify(fresh);
      var b64 = btoa(unescape(encodeURIComponent(json)));
      location.hash = '__livicat=' + b64;
      flushed += fresh.length;
    }}
    return flushed;
  }};

  console.log('[Livicat] Rust-driven scraper installed (no JS timers)');
}})();"#,
        strip_at_bool,
    )
}

// ─── Tests ─────────────────────────────────────────────────────────
//
// These tests verify the throttle-proof scraping design (the fix for
// messages stopping when the webview window is occluded/buried on macOS).
// They inspect the generated observer script's structure — a real webview
// requires a full Tauri environment, but the script is a generated string
// whose invariants we can assert directly.
//
// The core contract being guarded:
//   1. NO self-running JS timers (setInterval / MutationObserver) — these
//      are what macOS suspends when the window is occluded, which caused
//      the "sometimes works sometimes not" bug.
//   2. A single window.__livicatScrape() function that Rust drives via
//      eval on a native tokio timer.
//   3. Dedup so the full-DOM scan doesn't re-send messages each tick.
#[cfg(test)]
mod tests {
    use super::build_observer_script;

    /// Returns the script body with the IIFE wrapper, for substring checks.
    fn script(hide_atsign: bool) -> String {
        build_observer_script(hide_atsign)
    }

    // ── The critical fix: no self-running JS timers ──────────────

    /// Regression guard for the occlusion bug: the scrape script MUST NOT
    /// CALL setInterval. setInterval runs inside the webview's JS thread,
    /// which macOS suspends when the off-screen window is occluded. If this
    /// test fails, someone reintroduced a JS-driven heartbeat and messages
    /// will stall again when the window is buried.
    ///
    /// We match the CALL pattern `setInterval(` rather than the bare word,
    /// because the script's explanatory comments legitimately mention
    /// setInterval by name.
    #[test]
    fn test_scrape_script_does_not_call_set_interval() {
        let s = script(false);
        assert!(
            !s.contains("setInterval("),
            "scrape script must not call setInterval( — it gets suspended by \
             macOS window occlusion, reintroducing the stalling bug. Got:\n{s}"
        );
    }

    /// Regression guard for the occlusion bug: the scrape script MUST NOT
    /// construct a MutationObserver to drive capture. Like setInterval, it
    /// runs inside the (throttleable) webview JS thread.
    #[test]
    fn test_scrape_script_has_no_mutation_observer_for_capture() {
        let s = script(false);
        assert!(
            !s.contains("new MutationObserver("),
            "scrape script must not construct a MutationObserver to capture \
             messages — it gets suspended by macOS window occlusion. Got:\n{s}"
        );
    }

    // ── The replacement mechanism: Rust-driven scrape ────────────

    /// The script MUST expose window.__livicatScrape as a function — this
    /// is what the Rust poll loop evals each tick. Without it, Rust has no
    /// scrape entry point and capture silently does nothing.
    #[test]
    fn test_exposes_livicat_scrape_function() {
        let s = script(false);
        assert!(
            s.contains("window.__livicatScrape"),
            "scrape script must expose window.__livicatScrape for the Rust \
             timer to eval. Got:\n{s}"
        );
        assert!(
            s.contains("window.__livicatScrape = function"),
            "__livicatScrape must be assigned a function. Got:\n{s}"
        );
    }

    /// The scrape function MUST do a full-DOM scan via querySelectorAll on
    /// the message renderer — this is how a single function handles both
    /// initial load (all existing messages) and incremental updates (only
    /// new ones since last scan). If this regresses to only-scraping-new-
    /// nodes, the initial message batch is lost.
    #[test]
    fn test_scrape_does_full_dom_scan() {
        let s = script(false);
        assert!(
            s.contains("querySelectorAll('yt-live-chat-text-message-renderer'"),
            "scrape must scan the full DOM for message elements each tick. Got:\n{s}"
        );
    }

    /// Dedup MUST be present so the full-DOM scan doesn't re-send every
    /// message on every tick (which would flood the store + OBS with
    /// duplicates). Guards the __livicat_seen fingerprint set.
    #[test]
    fn test_scrape_dedups_seen_messages() {
        let s = script(false);
        assert!(
            s.contains("__livicat_seen"),
            "scrape must maintain a __livicat_seen dedup set. Got:\n{s}"
        );
        assert!(
            s.contains("isDuplicate"),
            "scrape must call isDuplicate before sending. Got:\n{s}"
        );
    }

    /// The pending-batch queue MUST be present so that when location.hash
    /// is still occupied (Rust hasn't cleared the previous batch), a scrape
    /// queues its fresh messages instead of dropping them.
    #[test]
    fn test_scrape_has_pending_queue_for_busy_hash() {
        let s = script(false);
        assert!(
            s.contains("__livicat_pending"),
            "scrape must keep a __livicat_pending queue for the busy-hash case. Got:\n{s}"
        );
    }

    // ── Configuration embedding ─────────────────────────────────

    /// The hide_atsign flag must be embedded as a JS boolean. If it's
    /// emitted as a Rust string or number, @-stripping silently misbehaves.
    #[test]
    fn test_hide_atsign_embedded_as_boolean() {
        let on = script(true);
        assert!(
            on.contains("var STRIP_AT = true"),
            "hide_atsign=true must emit 'var STRIP_AT = true'. Got:\n{on}"
        );
        let off = script(false);
        assert!(
            off.contains("var STRIP_AT = false"),
            "hide_atsign=false must emit 'var STRIP_AT = false'. Got:\n{off}"
        );
    }

    // ── Role detection structure ────────────────────────────────

    /// The scrape MUST attempt author-type (YouTube's native attribute)
    /// for role detection — reading data-role alone (the old, broken
    /// behavior) classified every message as default on live chat.
    #[test]
    fn test_role_detection_reads_author_type() {
        let s = script(false);
        assert!(
            s.contains("getAttribute('author-type')"),
            "scrape must read author-type for role detection. Got:\n{s}"
        );
    }

    /// The script must be idempotent (guard on __livicat_installed) so a
    /// re-injection doesn't double-register globals or reset the dedup set
    /// (which would re-send every message). The Rust loop evals the scrape
    /// function repeatedly, but the installer runs once.
    #[test]
    fn test_script_is_idempotent() {
        let s = script(false);
        assert!(
            s.contains("__livicat_installed"),
            "scrape installer must guard on __livicat_installed to be idempotent. Got:\n{s}"
        );
    }
}
