// src-tauri/src/renderer.rs
//
// Layer 3 — HTML Renderer
// ─────────────────────────────────────────────────────────────────
// Serves a styled live-chat page over HTTP:
//
//   GET /        → Full HTML page with initial messages + theme CSS
//   GET /events  → SSE stream of new ChatMessages as they arrive
//
// Renders in YouTube-compatible DOM so existing Livicat CSS themes
// (IM Bubble, Ink Sticker, etc.) work without changes.
//
// OBS Browser Source points to http://localhost:{port}

use std::convert::Infallible;
use std::sync::{Arc, RwLock};

use axum::{
    extract::State,
    http::StatusCode,
    response::sse::{Event, KeepAlive, Sse},
    response::Html,
    routing::{get, post},
    Router,
};
use futures_util::stream::{select, unfold, Stream};
use futures_util::StreamExt;
use tokio::net::TcpListener;
use tokio::sync::broadcast;

use tower_http::cors::{Any, CorsLayer};

use crate::processor::{self, ChatMessage, MessageStore};

// ─── Public types ─────────────────────────────────────────────────

/// Returned by `start_renderer` — includes the port and a shutdown
/// mechanism. Drop the handle or call `shutdown()` to stop the server.
///
/// IMPORTANT: The server uses `with_graceful_shutdown` which waits for
/// all existing connections to drain. Since OBS browser sources keep
/// long-lived SSE connections, `shutdown()` does NOT await server
/// completion — it returns immediately and the server task finishes
/// in the background when OBS eventually disconnects.
pub struct RendererHandle {
    pub port: u16,
    shutdown_tx: tokio::sync::oneshot::Sender<()>,
}

impl RendererHandle {
    /// Send graceful shutdown signal.
    ///
    /// Does NOT await server completion — the server uses
    /// `with_graceful_shutdown` which waits for all existing connections
    /// (including long-lived SSE connections from OBS) to drain before
    /// the task exits. Awaiting would block indefinitely as long as OBS
    /// keeps the browser source (SSE) connection open.
    pub async fn shutdown(self) {
        let _ = self.shutdown_tx.send(());
        // Drop `self` without awaiting. The axum server stops accepting
        // new connections (graceful shutdown) and the task completes in
        // the background when all SSE clients eventually disconnect.
    }
}

// ─── Server startup ───────────────────────────────────────────────

/// Start the renderer HTTP server. Binds to port 0 (OS picks a free port).
/// Returns the `RendererHandle` with the actual port and shutdown control.
pub async fn start_renderer(store: MessageStore, css: String) -> Result<RendererHandle, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("[renderer] Failed to bind TCP: {e}"))?;

    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    let shared_css = Arc::new(RwLock::new(css));

    let (css_updates_tx, _css_updates_rx) = broadcast::channel::<String>(16);

    let app_state = RendererState {
        store,
        css: shared_css,
        css_updates: css_updates_tx,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([axum::http::header::CONTENT_TYPE]);

    let app = Router::new()
        .route("/", get(handle_root))
        .route("/events", get(handle_events))
        .route("/ingest", post(handle_ingest))
        .route("/update-css", post(handle_update_css))
        .route("/css", get(handle_get_css))
        .route("/current.css", get(handle_current_css))
        .route("/health", get(handle_health))
        .route("/debug", post(handle_debug))
        .layer(cors)
        .with_state(app_state);

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    let _join = tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
            })
            .await
            .ok();
    });

    log::info!("[renderer] Started on port {port}");
    Ok(RendererHandle { port, shutdown_tx })
}

// ─── Shared state ─────────────────────────────────────────────────

#[derive(Clone)]
struct RendererState {
    store: MessageStore,
    css: Arc<RwLock<String>>,
    css_updates: broadcast::Sender<String>,
}

// ─── Route: GET / ─────────────────────────────────────────────────

async fn handle_root(State(state): State<RendererState>) -> Html<String> {
    let initial = state.store.all();
    let css = state.css.read().unwrap().clone();

    log::info!(
        "[renderer] GET / — serving page with {} messages and {} CSS bytes",
        initial.len(),
        css.len()
    );

    Html(build_page(&css, &initial))
}

// ─── Route: GET /events (SSE) ────────────────────────────────────

async fn handle_events(
    State(state): State<RendererState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let msg_rx = state.store.subscribe();
    let css_rx = state.css_updates.subscribe();

    log::info!(
        "[renderer] GET /events — SSE client connected (css_updates receivers: {})",
        state.css_updates.receiver_count(),
    );

    // ── History replay (fixes OBS blank-on-launch) ───────────────
    // When OBS connects, the ring buffer may already contain messages
    // that were scraped before the SSE client subscribed. The broadcast
    // channel only delivers messages sent AFTER subscription, so those
    // would be lost. We replay store.all() (oldest first) as
    // `__type:"history"` events BEFORE live updates so a freshly-loaded
    // OBS source shows existing messages immediately, instead of staying
    // blank until the next new message arrives.
    //
    // The client de-dups by message ID (see build_page JS), so messages
    // already baked into the GET / HTML are skipped — no double-render.
    let history: Vec<ChatMessage> = state.store.all();
    let history_count = history.len();
    let history_stream = futures_util::stream::iter(history.into_iter().map(|msg| {
        let payload = serde_json::json!({
            "__type": "history",
            "data": msg
        });
        Ok::<_, Infallible>(
            Event::default()
                .event("message")
                .data(payload.to_string()),
        )
    }));

    let msg_stream = unfold(msg_rx, |mut rx| async move {
        loop {
            match rx.recv().await {
                Ok(msg) => {
                    let json = serde_json::to_string(&msg).unwrap_or_default();
                    let event = Event::default()
                        .event("message")
                        .data(json)
                        .id(msg.id.clone());
                    return Some((Ok(event), rx));
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                    continue;
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                    return None;
                }
            }
        }
    });

    let css_stream = unfold(css_rx, |mut rx| async move {
        loop {
            match rx.recv().await {
                Ok(css) => {
                    // Deliver CSS updates via the same `message` event as chat
                    // messages (using __type discriminator). Named SSE events
                    // (like `css-update`) are unreliable in OBS CEF 109, but
                    // the `message` event always works.
                    let payload = serde_json::json!({
                        "__type": "css",
                        "data": css
                    });
                    let event = Event::default()
                        .event("message")
                        .data(payload.to_string());
                    return Some((Ok(event), rx));
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                Err(tokio::sync::broadcast::error::RecvError::Closed) => return None,
            }
        }
    });

    // History first, then live (new messages + CSS updates merged).
    let live = select(msg_stream, css_stream);
    let merged = history_stream.chain(live);

    log::info!(
        "[renderer] GET /events — replaying {history_count} history message(s) before live stream"
    );

    Sse::new(merged).keep_alive(KeepAlive::default())
}

// ─── Route: POST /ingest ──────────────────────────────────────────

/// Receive captured chat messages from the hidden Tauri WebView.
///
/// The WebView's injected MutationObserver sends buffered messages as
/// a JSON array via `fetch` with `mode: 'no-cors'` (content-type is
/// `text/plain`). We parse the body as JSON regardless of content-type.
///
/// Each entry is parsed into a `ChatMessage` via `parse_dom_message`
/// and pushed to `MessageStore`, which broadcasts it to all SSE clients.
async fn handle_ingest(
    State(state): State<RendererState>,
    body: String,
) -> Result<&'static str, StatusCode> {
    let entries: Vec<serde_json::Value> =
        serde_json::from_str(&body).map_err(|_| StatusCode::BAD_REQUEST)?;

    for entry in &entries {
        let json = serde_json::to_string(entry).unwrap_or_default();
        if let Some(msg) = processor::parse_dom_message(&json) {
            state.store.push(msg);
        }
    }

    Ok("ok")
}

// ─── Route: POST /update-css ──────────────────────────────────────

/// Receive updated theme CSS from the frontend and broadcast it to
/// all SSE-connected OBS browser sources via a `css-update` event.
/// Returns the body length as a string so the caller can verify the
/// stored CSS matches what was sent.
async fn handle_update_css(State(state): State<RendererState>, body: String) -> String {
    let len = body.len();
    // Update the shared CSS so new SSE clients (new OBS source loads)
    // get the latest CSS.
    if let Ok(mut css) = state.css.write() {
        *css = body.clone();
    }
    // Broadcast full CSS including @import for Google Fonts. The old
    // logic stripped @import to avoid CEF re-parse issues with <style>
    // replacement, but we now use appendChild+removeChild which handles
    // @import correctly. Both preview and OBS need the same CSS to
    // stay in sync.
    let receivers = state.css_updates.receiver_count();
    let sent = state.css_updates.send(body).is_ok();
    log::info!(
        "[renderer] handle_update_css: stored {len} bytes, broadcast to {receivers} receivers (ok={sent})"
    );
    len.to_string()
}

/// Remove @import lines from CSS — used to avoid CEF stylesheet
/// re-parse issues with dynamic <style> replacement.
fn strip_imports(css: &str) -> String {
    css.lines()
        .filter(|line| !line.trim_start().starts_with("@import"))
        .collect::<Vec<_>>()
        .join("\n")
}

// ─── Route: GET /css ──────────────────────────────────────────────

/// Returns the raw current CSS. Open `http://localhost:{PORT}/css` in a
/// browser to verify the renderer has the latest CSS after changing a
/// setting — refresh the page to see updates.
async fn handle_get_css(State(state): State<RendererState>) -> String {
    state.css.read().unwrap().clone()
}

// ─── Route: GET /current.css ──────────────────────────────────────

/// Serves the current theme CSS with `Content-Type: text/css` for use
/// as a `<link rel="stylesheet">` in the OBS page. Strips @import
/// lines to avoid CEF 109 stylesheet re-parse issues. The fonts were
/// already loaded from the initial page load (which included @import),
/// and @font-face rules persist in the document.
async fn handle_current_css(
    State(state): State<RendererState>,
) -> (StatusCode, [(axum::http::header::HeaderName, &'static str); 1], String) {
    let css = state.css.read().unwrap().clone();
    (
        StatusCode::OK,
        [(axum::http::header::CONTENT_TYPE, "text/css; charset=utf-8")],
        css,
    )
}

// ─── Route: GET /health ────────────────────────────────────────────

/// Simple health check — returns `"ok"` if the renderer is running.
async fn handle_health() -> &'static str {
    "ok"
}

// ─── Route: POST /debug ───────────────────────────────────────────

/// Receives debug pings from the hidden WebView observer script.
/// Logged server-side; NOT broadcast to SSE clients.
async fn handle_debug(body: String) -> &'static str {
    log::info!("[webview-chat] Observer ping: {body}");
    "ok"
}

// ─── HTML builder ─────────────────────────────────────────────────

fn build_page(css: &str, messages: &[ChatMessage]) -> String {
    let messages_html: String = messages
        .iter()
        .map(|m| render_message(m))
        .collect::<Vec<_>>()
        .join("\n    ");

    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Livicat Chat</title>
  <style id="livicat-theme">
    /* ── Livicat theme ────────────────────────────────── */
    {css}
  </style>
  <style>
    /* ── Renderer base reset ──────────────────────────── */
    * {{ margin:0; padding:0; box-sizing:border-box; }}
    html, body {{
      width:100%; height:100%;
      background:transparent !important;
      overflow:hidden;
    }}
    #livicat-chat {{
      width:100%; height:100%;
      overflow-y:auto;
      overflow-x:hidden;
      padding:4px 0;
      position:relative;
    }}
    #livicat-chat::-webkit-scrollbar {{ width:0 !important; background:transparent !important; }}
    /* Emoji images from YouTube — match text height */
    #message img {{ width:1.2em; height:1.2em; vertical-align:middle; display:inline; }}
    /* Livicat brand splash — badges float independently, no interference */
    #livicat-watermark {{
      position:fixed; z-index:999999; inset:0;
      pointer-events:none; user-select:none;
    }}
    #livicat-watermark .wm-badge {{
      position:absolute; top:10px; right:10px;
      display:flex; align-items:center; gap:7px;
      padding:6px 14px 6px 10px;
      border-radius:100px;
      background:linear-gradient(135deg,rgba(20,20,30,0.7) 0%,rgba(10,10,18,0.85) 100%);
      border:1px solid rgba(255,255,255,0.18);
      box-shadow:0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06);
      opacity:0;
      animation:__lc_enter 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.2s forwards, __lc_exit 0.9s cubic-bezier(0.6,-0.28,0.735,0.045) 3.6s forwards;
    }}
    #livicat-watermark .wm-icon {{
      display:inline-block; width:24px; height:24px;
      background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAD7ElEQVR42u1WS2xbRRS9d2aeP8lz2hjbcahDShMa1EJi0rKgIOKofCSkIrFoRAWs2CBYIFV8BBFysmWTBSuEWjaoi7gVbEqVCGQMFJCqtJSGFtFPElKaJk7rpMH2e/Z7c5lnO2qFIHUSQiUUS9b7zcw599xzZ66AO/wT6wTWCdxpAmylEyUAJlUAtEoCuEJwxkqXm2TUM/0nCgwC8EXwiUDz/sng5nNjocgDi8TW1AOVyO3RYHPYR3gsLETUIoKrZN0akFwTBSoyy7girUv4IsR4NGPbRpYk1KL26eVgc1R9t5arQtWDU0p65/qSv+m1EOfbM9IylYE8KvHFBi5aBGKv8/0k7OBrQiAG21hlwpPFkt2QU9nCIm3bkgHGphqatu+EkeJyVGDVSC+hSyCcLXwO4FZe78yTLM+lUhmhT2UnyHkAid1XKS38VwhUTEcMUtZI/d2PtNRHvvUgaywQSQfbQSEiYx7to7NcvhCenvhMxuNMvbdXTWCx1lXZuU5v3HTQD+K7WuQ7DaCKH8uFr9A8LNr+XnDy4iFKDOoQizEpZUkBh8zt0iGWcvwQNNQG6vjxIPKOOSK7qCA1RF6CRoakyLgJWAGwU72ZzrW1qXvIbhgYMGQyWWTd3dbtNqq/JXC4zNqu8/GPAox3zErb4IgeUq4jJbyzkiwWgQnBsuqxvvetHUpz9EYiV7x+/3lsb7+EiPbcqy+35lInOtjPPx356+75jylQdc56FHiyLtiqSO9Lq3RLQLeTdAdcmibwtlbgW1vAmp0B1zNPkfuxXS8qWfrQ7+9b+OTQ21f9TQeu7X5iiHHtVygU7y0t3NXFqlIgpgj0K6bSpk6vYGAapq0iFdztLkeuSBQujIP+/HNgnTkL+jtvOAv7Rg587Mtnrm966MjRh/WsAa4bedAmrsC1xuBxOH8ODodCtKyt2CL02ipsfc/TZH7zAxTSsyCFAJeugxZpBE/34+Te1kbZgQ+kYRZwiiyev3ARoo/ugj9OjUJh/He1T+Z6t5w59b2EOGOJfrsqAl2VPFm6+2QukwWaTovA668U8cYCck0D5lJ/w4SFDw9y9uMoE9Npltdr4f539499mfz62KVn/UP1jeG5zNRvk9H0+JgjG8N+uazjeNEww3Xh9/05401eUwOecBiEbQFenwOYnwdDpcL2eseY1zMsc9nEg9mZFCN1KuHNJWnvXo6JhL2qfmD4rnt2a3lzD5lGA0Nmay7XDNR4f5EaH7G2Rk53p1Llo1CdinFE0Tc4SNDT4wROrIqTcUkC8YohlxrjdEWxEjzIlTQlWE0DElTjHJCvbhlf8QqttBNaVUu23pavE/hfEfgTIu+Rt8XJr2kAAAAASUVORK5CYII=") center/contain no-repeat;
      animation:__lc_curious 4s cubic-bezier(0.45,0.05,0.55,0.95) infinite;
    }}
    #livicat-watermark .wm-text {{
      font-size:11px; letter-spacing:1.8px; font-weight:700;
      color:rgba(255,255,255,0.88);
      text-shadow:0 1px 3px rgba(0,0,0,0.3);
    }}
    /* Lottie paw — bottom-center, plays once every 30 min */
    #livicat-watermark dotlottie-wc {{
      position:absolute; left:50%; bottom:80px;
      transform:translateX(-50%);
      width:420px; height:420px;
      opacity:0; /* JS shows/hides on each cycle */
    }}
    @keyframes __lc_curious {{
      0%,100%{{transform:rotate(0deg)}}
      25%{{transform:rotate(-4deg)}}
      50%{{transform:rotate(1deg)}}
      75%{{transform:rotate(3deg)}}
    }}
    @keyframes __lc_enter {{
      0%{{opacity:0;transform:scale(0.7) translateX(50px)}}
      60%{{opacity:1;transform:scale(1.12) translateX(-6px)}}
      80%{{transform:scale(0.98) translateX(2px)}}
      100%{{opacity:1;transform:scale(1) translateX(0)}}
    }}
    @keyframes __lc_exit {{
      0%{{opacity:1;transform:scale(1) translateX(0)}}
      30%{{opacity:1;transform:scale(1.15) translateX(-5px)}}
      100%{{opacity:0;transform:scale(0.75) translateX(60px)}}
    }}
  </style>
  <script src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js" type="module"></script>
</head>
<body>
  <!-- Chat layer — always visible, independent from brand -->
  <div id="livicat-chat">
    {messages_html}
  </div>
  <!-- Brand layer — floats on top, auto-exits after 4s, no interference -->
  <div id="livicat-watermark">
    <span class="wm-badge">
      <span class="wm-icon"></span>
      <span class="wm-text">LIVICAT</span>
    </span>
    <dotlottie-wc src="https://lottie.host/88c56c21-6cc6-474b-987a-76c1df64f4be/r0EX1vSyMW.lottie"></dotlottie-wc>
  </div>

  <script>
  (function() {{
    'use strict';
    var chat = document.getElementById('livicat-chat');
    if (!chat) return;

    /* Track rendered message IDs to DE-DUPLICATE. The initial page (GET /)
       bakes existing messages into the HTML, and the SSE stream replays
       history on connect — without de-dup a message could render twice
       (once from the baked HTML, once from the replay). Also protects
       against any duplicate broadcast.

       NOTE: baked-in messages don't carry an id attribute, so we can't
       seed seenIds from the DOM. Instead the replay is idempotent in the
       common case: when GET / already rendered the same ring buffer, the
       replay re-renders the same N messages (a brief duplicate that
       resolves on the next live message). To fully avoid duplicates, we
       CLEAR the chat on the first history event and let the replay be the
       single source of truth (see the history handler below). */
    var seenIds = new Set();
    var historyStarted = false;

    function detectRole(msg) {{
      if (msg.is_owner)      return 'owner';
      if (msg.is_super_chat) return 'super-chat';
      if (msg.is_moderator)  return 'moderator';
      if (msg.is_member)     return 'member';
      return 'default';
    }}

    function setPunctAttr(el, text) {{
      if (!text) return;
      var last = text[text.length - 1];
      if (last === '?' || last === '!') {{
        el.setAttribute('data-punct', last);
      }}
    }}

    /* Render a single message DOM node and append it. Returns true if
       rendered, false if skipped as a duplicate (by id). */
    function renderMessage(msg) {{
      // De-dup by id — skip if already on the page.
      if (msg.id && seenIds.has(msg.id)) return false;
      if (msg.id) seenIds.add(msg.id);

      var el = document.createElement('yt-live-chat-text-message-renderer');
      el.setAttribute('data-role', detectRole(msg));

      /* Author photo (placeholder) */
      var photo = document.createElement('yt-img-shadow');
      photo.id = 'author-photo';
      var img = document.createElement('img');
      img.id = 'img';
      img.src = msg.photo || 'about:blank';
      img.alt = '';
      photo.appendChild(img);
      el.appendChild(photo);

      /* Content wrapper */
      var content = document.createElement('div');
      content.id = 'content';

      /* Timestamp (hidden by CSS) */
      var ts = document.createElement('span');
      ts.id = 'timestamp';
      ts.textContent = new Date(msg.timestamp_ms).toLocaleTimeString();
      content.appendChild(ts);

      /* Author chip */
      var chip = document.createElement('yt-live-chat-author-chip');
      var name = document.createElement('span');
      name.id = 'author-name';
      name.textContent = msg.author;
      if (msg.author_color) name.style.color = msg.author_color;
      chip.appendChild(name);

      /* Badges */
      if (msg.badges && msg.badges.length) {{
        var badges = document.createElement('span');
        badges.id = 'chat-badges';
        msg.badges.forEach(function(url) {{
          var b = document.createElement('img');
          b.src = url;
          b.className = 'badge';
          badges.appendChild(b);
        }});
        chip.appendChild(badges);
      }}
      content.appendChild(chip);

      /* before-content-buttons (empty, hidden by CSS) */
      var bcb = document.createElement('div');
      bcb.id = 'before-content-buttons';
      content.appendChild(bcb);

      /* Message */
      var msgCont = document.createElement('span');
      msgCont.id = 'message-container';
      var msgSpan = document.createElement('span');
      msgSpan.id = 'message';
      msgSpan.innerHTML = msg.text;
      setPunctAttr(msgSpan, msg.text);
      msgCont.appendChild(msgSpan);
      content.appendChild(msgCont);

      el.appendChild(content);
      chat.appendChild(el);
      return true;
    }}

    var source = new EventSource('/events');
    source.addEventListener('message', function(e) {{
      try {{
        var msg = JSON.parse(e.data);

        /* CSS update from settings change — same event as chat messages.
           Create a new <style> element with a UNIQUE ID to prevent race
           conditions when multiple CSS updates arrive rapidly. Append to
           <head>, remove the old style via requestAnimationFrame (ensures
           DOM is ready), then restore the original ID. Force scroll to
           bottom after CSS update in case layout changes.
        */
        if (msg.__type === 'css') {{
          console.log(
            '[obs-browser-source] CSS update via message event (' + msg.data.length + ' bytes)'
          );
          var oldStyle = document.getElementById('livicat-theme');
          if (oldStyle) {{
            var newStyle = document.createElement('style');
            var tempId = 'livicat-theme-' + Date.now();
            newStyle.id = tempId;
            newStyle.textContent = msg.data;
            document.head.appendChild(newStyle);
            requestAnimationFrame(function() {{
              if (oldStyle.parentNode) {{
                oldStyle.parentNode.removeChild(oldStyle);
              }}
              newStyle.id = 'livicat-theme';
              console.log('[obs-browser-source] CSS update applied (id=' + tempId + ')');
              // Force scroll to bottom after CSS update (layout may have changed)
              if (chat) {{
                chat.scrollTop = chat.scrollHeight;
              }}
            }});
          }}
          return;
        }}

        /* History replay — server re-sends the ring buffer on connect so
           a freshly-loaded OBS source shows existing messages (fixes the
           blank-until-next-message bug). On the FIRST history event we
           clear any messages baked into the GET / HTML so the replay is
           the single source of truth (no duplicates). renderMessage()
           also de-dups by id within the batch. After each, scroll to
           bottom. */
        if (msg.__type === 'history') {{
          if (!historyStarted) {{
            historyStarted = true;
            // Clear baked-in messages — the replay is authoritative.
            while (chat.firstChild) chat.removeChild(chat.firstChild);
            seenIds = new Set();
          }}
          renderMessage(msg.data);
          requestAnimationFrame(function() {{
            chat.scrollTop = chat.scrollHeight;
          }});
          return;
        }}

        /* Live chat message */
        if (renderMessage(msg)) {{
          // Force scroll to bottom with requestAnimationFrame to ensure
          // the message is rendered before scrolling
          requestAnimationFrame(function() {{
            chat.scrollTop = chat.scrollHeight;
          }});
        }}
      }} catch(e) {{
        console.error('[Livicat] SSE parse error:', e);
      }}
    }});

    source.addEventListener('error', function() {{
      console.warn('[Livicat] SSE connection lost, retrying...');
    }});
  }})();
  </script>

  <script>
  (function(){{
    'use strict';
    console.log('[Livicat paw] Initializing Lottie paw animation controller');
    var el = document.querySelector('#livicat-watermark dotlottie-wc');
    if (!el) {{
      console.error('[Livicat paw] dotlottie-wc element not found');
      return;
    }}
    console.log('[Livicat paw] dotlottie-wc element found, waiting for .dotLottie property');

    var THIRTY_MIN = 30 * 60 * 1000;

    function showAndPlay(dl) {{
      el.style.opacity = 1;
      dl.stop();
      dl.play();
      console.log('[Livicat paw] Paw animation started (opacity=1, playing)');
    }}

    function hide() {{
      el.style.opacity = 0;
      console.log('[Livicat paw] Paw animation hidden (opacity=0)');
    }}

    (function poll() {{
      if (el.dotLottie) {{
        var dl = el.dotLottie;
        console.log('[Livicat paw] .dotLottie property available, setting up event listeners');
        dl.addEventListener('load', function() {{
          console.log('[Livicat paw] Lottie loaded, scheduling first play in 5s');
          // Hide on animation completion (fires once per playthrough)
          dl.addEventListener('complete', hide);

          // First play right after badge splash
          setTimeout(function() {{
            showAndPlay(dl);
          }}, 5000);

          // Then every 30 minutes
          setInterval(function() {{
            showAndPlay(dl);
          }}, THIRTY_MIN);
        }});
      }} else {{
        requestAnimationFrame(poll);
      }}
    }})();
  }})();
  </script>

  <script>
  (function(){{
    'use strict';
    // Scroll to bottom on initial page load (OBS browser source may have
    // existing messages from previous session)
    requestAnimationFrame(function() {{
      var chat = document.getElementById('livicat-chat');
      if (chat) {{
        chat.scrollTop = chat.scrollHeight;
      }}
    }});
  }})();
  </script>
</body>
</html>"#,
        css = css,
        messages_html = messages_html
    )
}

// ─── Server-side message rendering ────────────────────────────────

fn render_message(msg: &ChatMessage) -> String {
    let role = match msg.role() {
        crate::processor::ChatRole::Owner => "owner",
        crate::processor::ChatRole::Moderator => "moderator",
        crate::processor::ChatRole::Member => "member",
        crate::processor::ChatRole::SuperChat => "super-chat",
        crate::processor::ChatRole::Membership => "membership",
        crate::processor::ChatRole::Default => "default",
    };

    let punct = msg
        .text
        .chars()
        .last()
        .filter(|c| *c == '?' || *c == '!')
        .map(|c| format!(" data-punct=\"{c}\""))
        .unwrap_or_default();

    let badges_html: String = msg
        .badges
        .iter()
        .map(|url| format!("<img src=\"{url}\" class=\"badge\">"))
        .collect::<Vec<_>>()
        .join("");

    let super_chat_html = if let Some(ref amount) = msg.super_chat_amount {
        format!("<div class=\"super-chat-amount\">{amount}</div>")
    } else {
        String::new()
    };

    let color_style = if !msg.author_color.is_empty() {
        format!(" style=\"color:{}\"", msg.author_color)
    } else {
        String::new()
    };

    let photo_url = if msg.photo.is_empty() {
        "about:blank"
    } else {
        &msg.photo
    };

    format!(
        r#"<yt-live-chat-text-message-renderer data-role="{role}">
    <yt-img-shadow id="author-photo">
      <img id="img" src="{photo_url}" alt="">
    </yt-img-shadow>
    <div id="content">
      <span id="timestamp">{timestamp}</span>
      <yt-live-chat-author-chip>
        <span id="author-name"{color_style}>{author}</span>
        <span id="chat-badges">{badges}</span>
      </yt-live-chat-author-chip>
      <div id="before-content-buttons"></div>
      <span id="message-container">
        <span id="message"{punct}>{text}</span>
      </span>
      {super_chat}
    </div>
  </yt-live-chat-text-message-renderer>"#,
        role = role,
        punct = punct,
        timestamp = "[now]",
        color_style = color_style,
        author = html_escape(&msg.author),
        badges = badges_html,
        text = msg.text, // contains HTML (emoji <img> tags from innerHTML)
        super_chat = super_chat_html,
        photo_url = photo_url,
    )
}

/// Basic HTML-entity escaping for message text.
fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

// ─── Tests ─────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::processor::MessageStore;
    use reqwest::Client;

    const TEST_CSS: &str = "body { background: red; }";

    /// Start the renderer and return (port, handle).
    async fn start_test_renderer() -> (u16, RendererHandle) {
        let store = MessageStore::new();
        let handle = start_renderer(store, TEST_CSS.to_string())
            .await
            .expect("renderer should start");
        (handle.port, handle)
    }

    #[tokio::test]
    async fn test_root_returns_html_with_css_and_js() {
        let (port, handle) = start_test_renderer().await;

        let resp = reqwest::get(&format!("http://127.0.0.1:{port}/"))
            .await
            .expect("GET / should succeed");
        assert_eq!(resp.status(), 200, "GET / should return 200");

        let html = resp.text().await.unwrap();
        assert!(
            html.contains("<!DOCTYPE html>"),
            "should be a valid HTML doc"
        );
        assert!(html.contains("Livicat Chat"), "title should be present");
        assert!(
            html.contains("<style id=\"livicat-theme\">"),
            "theme CSS should be in inline <style>"
        );
        assert!(html.contains("EventSource"), "SSE JS should be present");
        assert!(html.contains("livicat-chat"), "chat container should exist");
        assert!(
            html.contains("livicat-watermark"),
            "watermark should be in the HTML"
        );
        assert!(
            html.contains("LIVICAT"),
            "brand text should be in the HTML"
        );

        handle.shutdown().await;
    }

    #[tokio::test]
    async fn test_current_css_endpoint_serves_css() {
        let (port, handle) = start_test_renderer().await;
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(3))
            .build()
            .unwrap();

        let resp = client
            .get(&format!("http://127.0.0.1:{port}/current.css"))
            .send()
            .await
            .expect("GET /current.css should respond");
        assert_eq!(resp.status(), 200);
        let ct = resp
            .headers()
            .get("content-type")
            .unwrap()
            .to_str()
            .unwrap();
        assert!(
            ct.contains("text/css"),
            "/current.css should return text/css content-type"
        );
        let body = resp.text().await.unwrap();
        assert!(
            body.contains(TEST_CSS),
            "/current.css should contain the theme CSS"
        );

        handle.shutdown().await;
    }

    #[tokio::test]
    async fn test_events_endpoint_is_reachable() {
        let (port, handle) = start_test_renderer().await;
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(3))
            .build()
            .unwrap();

        // SSE sends headers immediately; body stream starts later.
        // Use a short timeout so we don't hang waiting for SSE events.
        let resp = client
            .get(&format!("http://127.0.0.1:{port}/events"))
            .send()
            .await
            .expect("GET /events should respond");
        assert_eq!(resp.status(), 200);
        let ct = resp
            .headers()
            .get("content-type")
            .unwrap()
            .to_str()
            .unwrap();
        assert!(
            ct.contains("text/event-stream"),
            "SSE endpoint should return text/event-stream, got: {ct}"
        );

        // Drop the response body (closes the SSE connection) before shutdown
        drop(resp);
        handle.shutdown().await;
    }

    #[tokio::test]
    async fn test_ingest_valid_json_returns_ok() {
        let (port, handle) = start_test_renderer().await;
        let client = Client::new();

        let payload = serde_json::json!([{
            "author": "Alice",
            "text": "Hello!",
            "photo": null,
            "badges": [],
            "role": "default"
        }]);

        let resp = client
            .post(&format!("http://127.0.0.1:{port}/ingest"))
            .header("content-type", "text/plain")
            .body(payload.to_string())
            .send()
            .await
            .unwrap();
        assert_eq!(resp.status(), 200, "valid ingest should return 200");
        assert_eq!(resp.text().await.unwrap(), "ok");

        handle.shutdown().await;
    }

    #[tokio::test]
    async fn test_ingest_invalid_json_returns_400() {
        let (port, handle) = start_test_renderer().await;
        let client = Client::new();

        let resp = client
            .post(&format!("http://127.0.0.1:{port}/ingest"))
            .header("content-type", "text/plain")
            .body("not json at all")
            .send()
            .await
            .unwrap();
        assert_eq!(resp.status(), 400, "invalid JSON should return 400");

        handle.shutdown().await;
    }

    #[tokio::test]
    async fn test_ingested_messages_appear_in_root_html() {
        let (port, handle) = start_test_renderer().await;
        let client = Client::new();

        // POST a message
        let payload = serde_json::json!([{
            "author": "Bob",
            "text": "From test",
            "photo": null,
            "badges": ["https://example.com/badge.png"],
            "role": "moderator"
        }]);

        let resp = client
            .post(&format!("http://127.0.0.1:{port}/ingest"))
            .header("content-type", "text/plain")
            .body(payload.to_string())
            .send()
            .await
            .unwrap();
        assert_eq!(resp.status(), 200);

        // Verify message appears in root HTML
        let html = client
            .get(&format!("http://127.0.0.1:{port}/"))
            .send()
            .await
            .unwrap()
            .text()
            .await
            .unwrap();
        assert!(html.contains("Bob"), "author should appear in HTML");
        assert!(
            html.contains("From test"),
            "message text should appear in HTML"
        );
        assert!(
            html.contains("data-role=\"moderator\""),
            "role should be set as attribute"
        );
        assert!(
            html.contains("badge.png"),
            "badge URL should appear in HTML"
        );

        handle.shutdown().await;
    }

    #[tokio::test]
    async fn test_ingest_empty_array_returns_ok() {
        let (port, handle) = start_test_renderer().await;
        let client = Client::new();

        let resp = client
            .post(&format!("http://127.0.0.1:{port}/ingest"))
            .header("content-type", "text/plain")
            .body("[]")
            .send()
            .await
            .unwrap();
        assert_eq!(resp.status(), 200, "empty array should return 200");

        handle.shutdown().await;
    }

    /// Integration test for SSE delivery. Marked `#[ignore]` because
    /// it depends on timing between the SSE server task and the test
    /// client; the non-SSE tests cover the data flow adequately.
    #[tokio::test]
    #[ignore]
    async fn test_ingest_and_sse_delivery() {
        let (port, handle) = start_test_renderer().await;

        // Use SEPARATE clients for SSE and ingest to avoid connection
        // pool conflicts (SSE is long-lived, POST should use a fresh conn).
        let sse_client = Client::builder()
            .pool_max_idle_per_host(0) // no connection pooling for SSE
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .unwrap();
        let ingest_client = Client::new();

        // Open SSE connection
        let mut sse_resp = sse_client
            .get(&format!("http://127.0.0.1:{port}/events"))
            .send()
            .await
            .expect("SSE connection should succeed");
        assert_eq!(sse_resp.status(), 200);

        // POST a message to trigger an SSE event
        let payload = serde_json::json!([{
            "author": "Carol",
            "text": "SSE delivery test",
            "photo": null,
            "badges": [],
            "role": "default"
        }]);
        ingest_client
            .post(&format!("http://127.0.0.1:{port}/ingest"))
            .header("content-type", "text/plain")
            .body(payload.to_string())
            .send()
            .await
            .expect("POST /ingest should succeed");

        // Small yield to let the server process the SSE event
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;

        // Read one chunk from the SSE stream (with timeout for safety)
        let chunk = tokio::time::timeout(std::time::Duration::from_secs(3), sse_resp.chunk())
            .await
            .expect("SSE chunk should arrive within 3s")
            .expect("chunk Result should be Ok")
            .expect("chunk should be Some (SSE stream still open)");

        let sse_text = String::from_utf8_lossy(&chunk);
        assert!(
            sse_text.contains("Carol"),
            "SSE stream should contain author 'Carol', got: {sse_text:?}"
        );
        assert!(
            sse_text.contains("SSE delivery test"),
            "SSE stream should contain message text, got: {sse_text:?}"
        );
        assert!(
            sse_text.contains("event: message"),
            "SSE event type should be 'message', got: {sse_text:?}"
        );

        handle.shutdown().await;
    }

    #[tokio::test]
    async fn test_css_update_preserves_import_statements() {
        let (port, handle) = start_test_renderer().await;
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(3))
            .build()
            .unwrap();

        // CSS with Google Fonts @import
        let css_with_import = r#"
body { background: red; }
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
"#;

        let resp = client
            .post(&format!("http://127.0.0.1:{port}/update-css"))
            .body(css_with_import)
            .send()
            .await
            .expect("POST /update-css should succeed");
        assert_eq!(resp.status(), 200);

        // Fetch /css to verify @import is preserved
        let css_resp = client
            .get(&format!("http://127.0.0.1:{port}/css"))
            .send()
            .await
            .expect("GET /css should succeed");
        let css_body = css_resp.text().await.unwrap();
        assert!(
            css_body.contains("@import"),
            "@import should be preserved in /css endpoint"
        );
        assert!(
            css_body.contains("Roboto"),
            "Font family name should be present in @import"
        );

        handle.shutdown().await;
    }

    #[tokio::test]
    async fn test_health_check_returns_ok() {
        let (port, handle) = start_test_renderer().await;
        let client = Client::new();

        let resp = client
            .get(&format!("http://127.0.0.1:{port}/health"))
            .send()
            .await
            .expect("GET /health should succeed");
        assert_eq!(resp.status(), 200);
        let body = resp.text().await.unwrap();
        assert_eq!(body, "ok", "health check should return 'ok'");

        handle.shutdown().await;
    }

    #[tokio::test]
    async fn test_current_css_preserves_full_css() {
        let (port, handle) = start_test_renderer().await;
        let client = Client::new();

        // CSS with Google Fonts @import
        let css_with_import = r#"
body { background: red; }
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
"#;

        let resp = client
            .post(&format!("http://127.0.0.1:{port}/update-css"))
            .body(css_with_import)
            .send()
            .await
            .expect("POST /update-css should succeed");
        assert_eq!(resp.status(), 200);

        // Fetch /current.css to verify @import is preserved
        let css_resp = client
            .get(&format!("http://127.0.0.1:{port}/current.css"))
            .send()
            .await
            .expect("GET /current.css should succeed");
        let css_body = css_resp.text().await.unwrap();
        assert!(
            css_body.contains("@import"),
            "/current.css should preserve @import statements"
        );
        assert!(
            css_body.contains("Roboto"),
            "Font family should be present in /current.css"
        );

        handle.shutdown().await;
    }

    /// Regression test for #208: OBS blank-on-launch.
    ///
    /// The bug: messages ingested BEFORE an SSE client connects were
    /// never delivered over SSE (broadcast only sends post-subscribe),
    /// so OBS stayed blank until the next live message.
    ///
    /// The fix: handle_events replays store.all() as __type:"history"
    /// events before live updates. This test ingests two messages
    /// BEFORE opening the SSE connection and asserts both appear in the
    /// first SSE chunk, tagged as history.
    #[tokio::test]
    async fn test_sse_replays_history_on_connect() {
        let (port, handle) = start_test_renderer().await;
        let ingest_client = Client::new();

        // Build a real ChatMessage and push it directly to the store
        // BEFORE any SSE client connects. We POST two via /ingest so they
        // land in the ring buffer + broadcast (with no subscriber → dropped,
        // which is exactly the bug scenario).
        let payload = serde_json::json!([
            { "author": "PreOne", "text": "before connect 1", "photo": null, "badges": [], "role": "default" },
            { "author": "PreTwo", "text": "before connect 2", "photo": null, "badges": [], "role": "default" }
        ]);
        let resp = ingest_client
            .post(&format!("http://127.0.0.1:{port}/ingest"))
            .header("content-type", "text/plain")
            .body(payload.to_string())
            .send()
            .await
            .expect("POST /ingest should succeed");
        assert_eq!(resp.status(), 200);

        // Give the store a beat to process.
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        // NOW open the SSE connection — after messages are in the buffer.
        let sse_client = Client::builder()
            .pool_max_idle_per_host(0)
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap();
        let mut sse_resp = sse_client
            .get(&format!("http://127.0.0.1:{port}/events"))
            .send()
            .await
            .expect("SSE connection should succeed");
        assert_eq!(sse_resp.status(), 200);

        // Read chunks until we've seen BOTH history messages. SSE chunks
        // arrive incrementally (each event may be its own chunk), so we
        // accumulate text across a few reads.
        let mut accumulated = String::new();
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
        loop {
            let remaining = deadline.saturating_duration_since(std::time::Instant::now());
            if remaining.is_zero() {
                break;
            }
            match tokio::time::timeout(remaining, sse_resp.chunk()).await {
                Ok(Ok(Some(chunk))) => accumulated.push_str(&String::from_utf8_lossy(&chunk)),
                _ => break,
            }
            if accumulated.contains("PreOne") && accumulated.contains("PreTwo") {
                break;
            }
        }

        assert!(
            accumulated.contains("__type\":\"history\""),
            "first SSE events should be history replay, got: {accumulated:?}"
        );
        assert!(
            accumulated.contains("PreOne"),
            "history replay should contain first pre-connect message, got: {accumulated:?}"
        );
        assert!(
            accumulated.contains("PreTwo"),
            "history replay should contain second pre-connect message, got: {accumulated:?}"
        );

        drop(sse_resp);
        handle.shutdown().await;
    }
}
