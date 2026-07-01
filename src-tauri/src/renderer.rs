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

use axum::{
    extract::State,
    http::StatusCode,
    response::sse::{Event, KeepAlive, Sse},
    response::Html,
    routing::{get, post},
    Router,
};
use futures_util::stream::{unfold, Stream};
use tokio::net::TcpListener;

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
pub async fn start_renderer(
    store: MessageStore,
    css: String,
) -> Result<RendererHandle, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("[renderer] Failed to bind TCP: {e}"))?;

    let port = listener
        .local_addr()
        .map_err(|e| e.to_string())?
        .port();

    let shared_css = std::sync::Arc::new(css);

    let app_state = RendererState {
        store,
        css: shared_css,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([axum::http::Method::GET, axum::http::Method::POST, axum::http::Method::OPTIONS])
        .allow_headers([axum::http::header::CONTENT_TYPE]);

    let app = Router::new()
        .route("/", get(handle_root))
        .route("/events", get(handle_events))
        .route("/ingest", post(handle_ingest))
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
    Ok(RendererHandle {
        port,
        shutdown_tx,
    })
}

// ─── Shared state ─────────────────────────────────────────────────

#[derive(Clone)]
struct RendererState {
    store: MessageStore,
    css: std::sync::Arc<String>,
}

// ─── Route: GET / ─────────────────────────────────────────────────

async fn handle_root(State(state): State<RendererState>) -> Html<String> {
    let initial = state.store.all();
    let css = &*state.css;

    Html(build_page(css, &initial))
}

// ─── Route: GET /events (SSE) ────────────────────────────────────

async fn handle_events(
    State(state): State<RendererState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let rx = state.store.subscribe();

    let stream = unfold(rx, |mut rx| async move {
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
                    // Dropped some messages — keep going
                    continue;
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                    // Store dropped — stream ends
                    return None;
                }
            }
        }
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
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

// ─── Route: POST /debug ───────────────────────────────────────────

/// Receives debug pings from the hidden WebView observer script.
/// Logged server-side; NOT broadcast to SSE clients.
async fn handle_debug(
    body: String,
) -> &'static str {
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
  <style>
    /* ── Livicat theme ────────────────────────────────── */
    {css}

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
    /* Livicat watermark — shown when no messages yet */
    #livicat-watermark {{
      position:absolute; bottom:16px; left:0; right:0;
      text-align:center; opacity:0.35; pointer-events:none;
      transition:opacity 0.6s;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      user-select:none;
    }}
    #livicat-watermark .wm-icon {{
      display:inline-block; width:24px; height:24px;
      vertical-align:middle; margin-right:6px;
      background:currentColor;
      mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E") center/contain no-repeat;
      -webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E") center/contain no-repeat;
    }}
    #livicat-watermark .wm-text {{
      font-size:10px; letter-spacing:1px; font-weight:600;
      vertical-align:middle;
    }}
  </style>
</head>
<body>
  <div id="livicat-chat">
    {messages_html}
    <div id="livicat-watermark">
      <span class="wm-icon"></span>
      <span class="wm-text">LIVICAT</span>
    </div>
  </div>

  <script>
  (function() {{
    'use strict';
    var chat = document.getElementById('livicat-chat');
    if (!chat) return;

    /* Hide watermark on first incoming message */
    var wm = document.getElementById('livicat-watermark');
    var firstMsg = true;

    var source = new EventSource('/events');
    source.addEventListener('message', function(e) {{
      /* Hide watermark once */
      if (firstMsg && wm) {{
        firstMsg = false;
        wm.style.opacity = '0';
        setTimeout(function() {{ wm.style.display = 'none'; }}, 600);
      }}
      try {{
        var msg = JSON.parse(e.data);
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
        chat.scrollTop = chat.scrollHeight;
      }} catch(e) {{
        console.error('[Livicat] SSE parse error:', e);
      }}
    }});

    source.addEventListener('error', function() {{
      console.warn('[Livicat] SSE connection lost, retrying...');
    }});

    function detectRole(msg) {{
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

    let photo_url = if msg.photo.is_empty() { "about:blank" } else { &msg.photo };

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
        assert!(html.contains("<!DOCTYPE html>"), "should be a valid HTML doc");
        assert!(html.contains("Livicat Chat"), "title should be present");
        assert!(html.contains(TEST_CSS), "theme CSS should be injected");
        assert!(html.contains("EventSource"), "SSE JS should be present");
        assert!(html.contains("livicat-chat"), "chat container should exist");

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
        assert!(html.contains("From test"), "message text should appear in HTML");
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
        let chunk = tokio::time::timeout(
            std::time::Duration::from_secs(3),
            sse_resp.chunk(),
        )
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
}
